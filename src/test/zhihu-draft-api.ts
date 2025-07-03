import fs from "fs";
import * as zhihuDraftApi from "../zhihu/draft";

async function testZhihuDraftApi(): Promise<void> {
  const cookie =
    "_xsrf=OLy5fHckRY2dzCLxtSVbw445xINATbac; __zse_ck=004_uvv4A==AF3BaAqG34HlkDLmQIu0tzHculT8SUWaEWwInz9z4bsV2KnRhKvWja1AzO=RZ7MHOR8K/ylAbB1jfQWDh7kwti5jFoIgokKGmYbMD2xFo2lDKvM8AiXrRa/GH-K0RuIkY3uZgICu6wbN/8wOazd1c7XlclbLZwRXEiKZyD2C9HE2z7YFwO0VQm9gODNAL3vk+KoteWoYyhM1Mdey7u7BjObcgnta/9RzZ6xFxcloT4s/ZMXSpWE/COZOq9; _zap=517b5f54-65a2-4389-8739-7ef18b573474; d_c0=4NfT7w7-HxqPTjMJ5n2Ibop8qFRFxgiBQKg=|1741603573; Hm_lvt_98beee57fd2ef70ccdd5ca52b9740c49=1751052835,1751362507,1751383637; z_c0=2|1:0|10:1751124624|4:z_c0|80:MS4xcEtMU05RQUFBQUFtQUFBQVlBSlZUU0pBVEdsMFZkenU3cjNDdGxVTzdOTndXaFhEcTN2SGxnPT0=|d80baf6b35008391c81cd45e13f07bbc508d89856b9eef01e889a9385cbed660; Hm_lvt_bff3d83079cef1ed8fc5e3f4579ec3b3=1751124624,1751383695; tst=r; Hm_lpvt_98beee57fd2ef70ccdd5ca52b9740c49=1751394037; HMACCOUNT=166B565A2EFA1C8B; SESSIONID=NjVxJlcWUQaASjizaSOGc7XfAo5a9Ek0WcsdlHmBIjZ; Hm_lpvt_bff3d83079cef1ed8fc5e3f4579ec3b3=1751394038; JOID=VFwTAEO8-VnVvEh_CddyijSjs2wTisw_lYc7FFTdgzG6xXQyPpLuM7iwSHgHRV2FvzS-pc0z0ly9Bu_t6EIkBhg=; osd=VFoVAUi8_1_Ut0h5D9Z5ijKlsmcTjMo-noc9ElXWgze8xH8yOJTvOLi2TnkMRVuDvj--o8sy2Vy7AO7m6EQiBxM=; BEC=d6322fc1daba6406210e61eaa4ec5a7a";

  const zhihuhtml = "";

  console.log(zhihuhtml);
  const id: string | void = await zhihuDraftApi.createArticle(cookie);
  if (id) {
    await zhihuDraftApi.updateArticle(id, "title", zhihuhtml, cookie).then(console.log);
    
    await zhihuDraftApi.deleteArticle(id, cookie).then(console.log);
  }
}

testZhihuDraftApi();
