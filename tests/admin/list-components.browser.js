// 使用 Playwright CLI 的 run-code 执行；接口全部模拟，不写入业务数据。
async (page) => {
 await page.unroute('**/api/v1/**');
 let mode='normal';const requests=[];const errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 const user={id:'1',nickname:'模拟用户',phone:'13800000000',gender:1,status:'active',createdAt:'2026-10-09T00:00:00Z'};
 await page.route('**/api/v1/**',async route=>{
  const url=new URL(route.request().url());let data={list:[],orders:[],total:0};let status=200;
  if(url.pathname.endsWith('/admin/users')){
    requests.push(Object.fromEntries(url.searchParams));
    if(mode==='failure'){status=500;data=null;}
    else data={list:mode==='empty'?[]:[user],total:mode==='empty'?0:60};
  }else if(['/admin/product-modules','/admin/roles','/admin/assessment-templates','/admin/recommendation-rules','/admin/tags','/admin/shop/categories','/admin/venue-facilities'].some(s=>url.pathname.endsWith(s)))data=[];
  else if(url.pathname.endsWith('/invitation/stats'))data={totalInviters:0,totalInvitees:0,topInviters:[]};
  else if(url.pathname.endsWith('/product-leads/summary'))data={total:0,active:0,today:0,overdue:0,upcoming:0,converted:0,invalid:0};
  else if(url.pathname.endsWith('/products/analytics'))data={overview:{impressions:0,clicks:0,assessments:0,leads:0,activityRegistrations:0,clickRate:0,activityRegistrationRate:0},productStats:[],activityStats:[],sourceStats:[],formStats:[],trend:[]};
  await route.fulfill({status,json:{code:status===200?200:500001,message:'模拟列表请求',data}});
 });
 await page.evaluate(()=>localStorage.setItem('blisstribe_admin_token','mock-list-token'));
 await page.goto('http://localhost:5174/users');
 await page.getByText('模拟用户',{exact:true}).waitFor();
 await page.locator('.el-table__body-wrapper .el-checkbox').first().click();
 await page.getByRole('button',{name:/选中 1 个用户/}).waitFor();
 const initial=requests.length;
 await page.getByRole('button',{name:'下一页'}).click();
 await page.waitForFunction(()=>document.querySelector('.admin-list-pagination .el-pager li.is-active')?.textContent?.trim()==='2');
 await page.getByText('模拟用户',{exact:true}).waitFor();
 await page.locator('.admin-list-pagination .el-select').click();
 await page.getByRole('option',{name:'50条/页',exact:true}).click();
 await page.waitForFunction(()=>document.querySelector('.admin-list-pagination .el-pager li.is-active')?.textContent?.trim()==='1');
 await page.getByText('模拟用户',{exact:true}).waitFor();
 await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
 if(requests.length!==initial+2)throw new Error('分页重复请求：'+JSON.stringify(requests));
 if(requests.at(-1).page!=='1'||requests.at(-1).pageSize!=='50')throw new Error('分页容量未回到第一页');
 mode='failure';
 await page.getByRole('button',{name:'执行搜索',exact:true}).click();
 await page.getByRole('button',{name:'重新加载',exact:true}).waitFor();
 mode='empty';
 await page.getByRole('button',{name:'重新加载',exact:true}).click();
 await page.getByText('暂无数据，可调整筛选条件',{exact:true}).waitFor();
 if(await page.getByRole('button',{name:'重新加载',exact:true}).count())throw new Error('重试成功后错误未清除');
 const routes=['/admins','/agreements','/banners','/invitations','/partners','/products','/activities','/venues','/activity-registrations','/assessment-templates','/recommendation-rules','/recommendation-analytics','/product-leads','/tags','/shop/categories','/shop/products','/shop/orders','/shop/refunds','/shop/payment-exceptions'];
 for(const route of routes){
  await page.goto('http://localhost:5174'+route);
  await page.locator('.admin-list-table').first().waitFor();
  await page.getByText(/暂无数据|暂无符合条件的商品/).first().waitFor();
 }
 if(errors.length)throw new Error('页面运行错误：'+errors.join(';'));
 return {pages:20,checks:['公共组件渲染','行选择事件','分页单次请求','切换容量回到第一页','失败重试与空状态'],requests};
}
