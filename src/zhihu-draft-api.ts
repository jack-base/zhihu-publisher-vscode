import * as harreplayer from "./util/harreplayer";

async function updateArticle(
  articleId: string,
  title: string,
  content: string,
  cookie: string
): Promise<void> {
  const body = {"content":content,"table_of_contents":false,"delta_time":9,"can_reward":false};
  const replayer = new harreplayer.default();
  replayer.init("resource/req.har");
  replayer.modifyRequest(0, {
    url: `https://zhuanlan.zhihu.com/api/articles/${articleId}/draft`,
    headers: {
      Cookie: cookie,
    },
    postData: {
      mimeType: "application/json",
      params:{},
      text: body,
    },
    method:"PATCH"
  });
  replayer.replayRequestByIndex(0).then(() => {
    replayer.saveReplayResults("resource/resq.har");
    console.log("Updated: " + articleId);
  });
}

async function createArticle(cookie: string): Promise<string | void> {
  const body = {
    title: "1",
    delta_time: 0,
    can_reward: false,
  };
  let replayer = new harreplayer.default();
  replayer.init("resource/req.har");
  return replayer.replayRequestByIndex(0).then((results) => {
    console.log("Created: " + results.replayedResponse?.data.id);
    return results.replayedResponse?.data.id;
  });
}
async function deleteArticle(articleId: string, cookie: string): Promise<void> {
  const replayer = new harreplayer.default();
  replayer.init("resource/req.har");
  replayer.modifyRequest(0, {
    url: `https://www.zhihu.com/api/v4/articles/${articleId}/draft`,
    headers: {
      Cookie: cookie,
    },
    method: "DELETE",
  });
  
  return replayer.replayRequestByIndex(0).then(() => {replayer.saveReplayResults("resource/resq.har");
    console.log("Deleted: " + articleId);
  });
}

export { deleteArticle, createArticle, updateArticle };
