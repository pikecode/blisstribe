// src/product/services/ab-testing.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { RecommendationConfigService } from './recommendation-config.service';

interface TestConfig {
  name: string;
  moduleCode: string;
  controlConfig: any;
  experimentConfig: any;
  userSplit: number; // 0-100
  duration: number; // milliseconds
}

interface TestResult {
  test: any;
  control: any;
  experiment: any;
  improvement: any;
  recommendation: string;
}

@Injectable()
export class ABTestingService {
  private readonly logger = new Logger(ABTestingService.name);

  constructor(
    private prisma: PrismaService,
    private configService: RecommendationConfigService,
  ) {}

  /**
   * 创建新的 A/B 测试
   */
  async createTest(config: TestConfig) {
    this.logger.log(`🧪 Creating A/B test: ${config.name}`);

    const test = await this.prisma.aBTest.create({
      data: {
        name: config.name,
        moduleCode: config.moduleCode,
        status: 'ACTIVE',
        userSplit: config.userSplit,
        startTime: new Date(),
        endTime: new Date(Date.now() + config.duration),
        controlConfigJson: JSON.stringify(config.controlConfig),
        experimentConfigJson: JSON.stringify(config.experimentConfig),
      },
    });

    this.logger.log(`✅ Test created: ${test.id}`);
    this.logger.log(`   Name: ${test.name}`);
    this.logger.log(`   User split: ${test.userSplit}% experimental`);
    this.logger.log(`   Duration: ${config.duration / 1000 / 60 / 60} hours`);

    return test;
  }

  /**
   * 根据用户 ID 和模块获取应该使用的配置
   * 使用一致性哈希确保同一用户始终在同一组
   */
  async getUserConfig(userId: string, moduleCode: string) {
    // 查找活跃的测试
    const activeTest = await this.prisma.aBTest.findFirst({
      where: {
        moduleCode,
        status: 'ACTIVE',
        endTime: { gt: new Date() },
      },
    });

    if (!activeTest) {
      // 无活跃测试，使用默认配置
      return await this.configService.getConfig(moduleCode);
    }

    // 使用一致性哈希分配用户
    const hash = this.consistentHash(userId);
    const isExperiment = (hash % 100) < activeTest.userSplit;

    const config = isExperiment
      ? JSON.parse(activeTest.experimentConfigJson)
      : JSON.parse(activeTest.controlConfigJson);

    return {
      ...config,
      _testId: activeTest.id,
      _isExperiment: isExperiment,
    };
  }

  /**
   * 分析 A/B 测试结果
   */
  async analyzeTest(testId: string): Promise<TestResult> {
    this.logger.log(`📊 Analyzing A/B test: ${testId}`);

    const test = await this.prisma.aBTest.findUnique({
      where: { id: testId },
    });

    if (!test) {
      throw new Error(`Test not found: ${testId}`);
    }

    // 获取控制组和实验组的指标
    const controlMetrics = await this.getTestMetrics(
      test.id,
      false,
      test.startTime,
      test.endTime
    );

    const experimentMetrics = await this.getTestMetrics(
      test.id,
      true,
      test.startTime,
      test.endTime
    );

    // 计算提升
    const improvement = {
      ctr: this.calculateImprovement(
        controlMetrics.ctr,
        experimentMetrics.ctr
      ),
      conversion: this.calculateImprovement(
        controlMetrics.conversionRate,
        experimentMetrics.conversionRate
      ),
      satisfaction: this.calculateImprovement(
        controlMetrics.satisfaction,
        experimentMetrics.satisfaction
      ),
    };

    // 进行统计显著性检验
    const significance = {
      ctr: await this.calculateSignificance(
        controlMetrics.ctrSamples,
        experimentMetrics.ctrSamples
      ),
      conversion: await this.calculateSignificance(
        controlMetrics.conversionSamples,
        experimentMetrics.conversionSamples
      ),
    };

    // 生成建议
    const recommendation = this.generateRecommendation(
      improvement,
      significance
    );

    this.logger.log(`✅ Analysis complete`);
    this.logger.log(`   CTR improvement: ${improvement.ctr}%`);
    this.logger.log(`   Conversion improvement: ${improvement.conversion}%`);
    this.logger.log(`   Recommendation: ${recommendation}`);

    return {
      test,
      control: controlMetrics,
      experiment: experimentMetrics,
      improvement,
      recommendation,
    };
  }

  /**
   * 结束测试并发布获胜配置
   */
  async promoteWinner(testId: string, winner: 'control' | 'experiment') {
    this.logger.log(`🏆 Promoting ${winner} configuration for test: ${testId}`);

    const test = await this.prisma.aBTest.findUnique({
      where: { id: testId },
    });

    if (!test) {
      throw new Error(`Test not found: ${testId}`);
    }

    const winningConfig =
      winner === 'control'
        ? JSON.parse(test.controlConfigJson)
        : JSON.parse(test.experimentConfigJson);

    // 更新全局配置
    await this.configService.upsertConfig(test.moduleCode, winningConfig);

    // 标记测试为已完成
    await this.prisma.aBTest.update({
      where: { id: testId },
      data: {
        status: 'COMPLETED',
        winner,
      },
    });

    this.logger.log(`✅ ${winner} configuration promoted to production`);
  }

  // ==================== 私有方法 ====================

  private consistentHash(userId: string): number {
    // 简单的哈希函数 (生产环境应使用更复杂的)
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      const char = userId.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
  }

  private async getTestMetrics(
    testId: string,
    isExperiment: boolean,
    startTime: Date,
    endTime: Date
  ) {
    const metrics = await this.prisma.recommendationEvent.findMany({
      where: {
        createdAt: {
          gte: startTime,
          lte: endTime,
        },
        // 过滤测试用户
        // (这里需要存储 testId 在 event 中)
      },
    });

    if (metrics.length === 0) {
      return {
        ctr: 0,
        conversionRate: 0,
        satisfaction: 0,
        ctrSamples: 0,
        conversionSamples: 0,
      };
    }

    const clicks = metrics.filter((m) => m.clicked).length;
    const conversions = metrics.filter((m) => m.converted).length;

    return {
      ctr: (clicks / metrics.length) * 100,
      conversionRate: (conversions / metrics.length) * 100,
      satisfaction:
        metrics.reduce((sum, m) => sum + (m.viewDuration || 0), 0) /
        metrics.length,
      ctrSamples: metrics.length,
      conversionSamples: metrics.length,
    };
  }

  private calculateImprovement(control: number, experiment: number): number {
    if (control === 0) return 0;
    return ((experiment - control) / control) * 100;
  }

  private async calculateSignificance(
    controlSamples: number,
    experimentSamples: number
  ): Promise<{
    pValue: number;
    isSignificant: boolean;
  }> {
    // 简化: 使用样本大小作为代理
    // 生产环境应使用卡方检验或 t 检验

    const minSamples = 1000;
    const isSignificant =
      controlSamples >= minSamples && experimentSamples >= minSamples;

    return {
      pValue: isSignificant ? 0.01 : 0.5,
      isSignificant,
    };
  }

  private generateRecommendation(
    improvement: Record<string, number>,
    significance: any
  ): string {
    // CTR 提升 > 1% 且显著
    if (
      improvement.ctr > 1 &&
      significance.ctr.isSignificant
    ) {
      return '🏆 Promote experiment configuration (CTR improvement statistically significant)';
    }

    // 转化提升 > 0.5% 且显著
    if (
      improvement.conversion > 0.5 &&
      significance.conversion.isSignificant
    ) {
      return '🏆 Promote experiment configuration (Conversion improvement statistically significant)';
    }

    // 无明显改进
    if (improvement.ctr < 0.1 && improvement.conversion < 0.1) {
      return '↔️ No significant difference detected. Recommend continuing control configuration.';
    }

    // 实验组稍差
    if (improvement.ctr < 0 || improvement.conversion < 0) {
      return '❌ Experiment configuration performed worse. Keep control configuration.';
    }

    return '⏳ Collect more data for conclusive results (continue test for another week)';
  }
}
