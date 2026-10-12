// 用 Playwright CLI 的 run-code 执行此函数；仅使用模拟请求，不写入商品数据。
async (page) => {
 const sku={id:2,skuCode:'CUSHION-WHITE',specifications:{颜色:'米白',尺寸:'大号'},priceFen:9999,totalStock:100,reservedStock:5,soldStock:10,available:85,enabled:true};
 const product={id:13,categoryId:'12',name:'棉麻靠枕 · 自然系列',description:'柔软棉麻面料，适合客厅与卧室。',images:['http://localhost:4000/uploads/shop-demo-product-sleep.jpg'],priceFen:9999,priceMaxFen:12999,totalStock:120,reservedStock:5,soldStock:10,available:105,skus:[sku,{...sku,id:3,skuCode:'CUSHION-GREEN',specifications:{颜色:'青绿',尺寸:'大号'},priceFen:12999,totalStock:20,reservedStock:0,soldStock:0,available:20}],status:1,sortOrder:0};
 await page.route('**/api/v1/**',async route=>{
 let data={}; const url=route.request().url();
 if (route.request().method() === 'PUT' && url.endsWith('/shop/products/13')) {
   const payload = route.request().postDataJSON();
   if (payload.skus[0].skuCode !== 'CUSHION-WHITE' || payload.skus[1].skuCode !== 'CUSHION-GREEN') throw new Error('已有规格编码未保留');
 }
 if(url.includes('/shop/categories'))data=[{id:'12',name:'生活用品'}];
 else if(url.includes('/shop/products'))data={list:[product],total:1};
 await route.fulfill({json:{code:200,message:'success',data}});
 });
 await page.evaluate(()=>localStorage.setItem('blisstribe_admin_token','mock-layout-token'));
 await page.goto('http://localhost:5174/shop/products');
 if (await page.getByRole('columnheader',{name:'规格编码',exact:true}).count()) throw new Error('列表不应显示规格编码');
 await page.getByRole('button',{name:'编辑',exact:true}).click();
 await page.getByRole('tab',{name:'商品信息',exact:true}).waitFor();
 await page.getByRole('tab',{name:'规格与库存（2）',exact:true}).click();
 if (await page.locator('.product-dialog input[placeholder="编码选填，留空自动生成"]').count()) throw new Error('不应显示编码输入框');
 await page.getByRole('button',{name:'保存',exact:true}).click();
 await page.locator('.product-dialog').waitFor({state:'hidden'});
 await page.getByRole('button',{name:'编辑',exact:true}).click();
 await page.getByRole('tab',{name:'规格与库存（2）',exact:true}).click();
 await page.getByRole('button',{name:'规格 1 更多操作',exact:true}).click();
 await page.getByRole('menuitem',{name:'复制规格',exact:true}).click();
 await page.getByRole('button',{name:'保存',exact:true}).click();
 await page.getByRole('alert').filter({hasText:'规格组合重复'}).first().waitFor();
 const expanded=await page.locator('.sku-property-editor').count();
 if(expanded===0)throw new Error('错误规格未展开');
 await page.getByRole('button',{name:'取消',exact:true}).click();
 await page.getByRole('button',{name:'继续编辑',exact:true}).click();
 return {checks:['商品信息与图片布局','规格表格','错误定位及属性展开','未保存关闭提醒']};
}
