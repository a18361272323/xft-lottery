(function () {
  const APP_KEY = "d468702b-1e7c-465a-8d3b-6ffb3227e2bf";

  const MODEL_KEYS = {
    music: "MOon6DjqeS",
    lottery_config: "MOGa3itmJ3",
    lottery_result: "MOMB2Bl6Y4",
    lottery_prize: "MOCvi7CCkt",
    lottery_user: "MOFTt0ZA9N"
  };

  const METHOD_KEYS = {
    music: {
      list: "FU3wW3Zwbz"
    },
    lottery_config: {
      list: "FUThPwpPcT"
    },
    lottery_result: {
      list: "FUBziK2Gsk",
      add: "FUVkZfdnrB",
      delete: "FUUX1ct4mP"
    },
    lottery_prize: {
      list: "FUsgK31U75"
    },
    lottery_user: {
      list: "FU6Bys8H1X"
    }
  };

  function getParentHost() {
    try {
      if (window.parent && window.parent.location && window.parent.location.host) {
        return window.parent.location.host;
      }
    } catch (e) {}
    return window.location.host || "xft-demo.cmburl.cn";
  }

  function getEnv(host) {
    return host.indexOf("xft.cmbchina.com") > -1 ? "prd" : "uat";
  }

  function getBaseUrl() {
    const host = getParentHost();
    const env = getEnv(host);
    return {
      env,
      url: "https://" + host + "/xcodegw/app/" + APP_KEY + "/tag/" + env
    };
  }

  function runModelMethod(modelKey, methodKey, params) {
    const base = getBaseUrl();
    const url =
      base.url +
      "/api/run/odexftopenapiv2appmodelmethodrun" +
      "?appTag=" +
      base.env +
      "&modelKey=" +
      modelKey +
      "&methodKey=" +
      methodKey;

    return fetch(url, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        "xcode-appsource": "procode"
      },
      body: JSON.stringify(params || {})
    })
      .then(res => res.json())
      .then(data => {
        if (
          data.returnCode === "SUC0000" ||
          data.code === 0 ||
          data.code === 200
        ) {
          return data.body;
        }
        throw new Error(data.errorMsg || data.message || "模型方法调用失败");
      });
  }

  function list(modelName, params) {
    return runModelMethod(
      MODEL_KEYS[modelName],
      METHOD_KEYS[modelName].list,
      Object.assign(
        {
          current: 1,
          pageSize: 9999,
          is_deleted: 0
        },
        params || {}
      )
    ).then(body => {
      if (Array.isArray(body)) {
        return body;
      }
      return (body && body.list) || [];
    });
  }

  function add(modelName, params) {
    return runModelMethod(MODEL_KEYS[modelName], METHOD_KEYS[modelName].add, params);
  }

  function remove(modelName, id) {
    return runModelMethod(MODEL_KEYS[modelName], METHOD_KEYS[modelName].delete, {
      id
    });
  }

  function toUserArray(row) {
    return [row.user_no, row.user_name, row.department];
  }

  function toPrize(row) {
    return {
      type: String(row.type),
      count: row.count,
      title: row.title,
      text: row.text,
      img: row.img
    };
  }

  function buildLuckyData(results) {
    return results
      .filter(row => row.result_type === "lucky")
      .reduce((acc, row) => {
        const type = String(row.type);
        acc[type] = acc[type] || [];
        acc[type].push(toUserArray(row));
        return acc;
      }, {});
  }

  function pickUrl(value) {
    if (!value) {
      return "";
    }
    if (typeof value === "string") {
      const text = value.trim();
      if (!text) {
        return "";
      }
      if (text.charAt(0) === "{" || text.charAt(0) === "[") {
        try {
          return pickUrl(JSON.parse(text));
        } catch (e) {
          return text;
        }
      }
      return text;
    }
    if (Array.isArray(value)) {
      for (let i = 0; i < value.length; i++) {
        const url = pickUrl(value[i]);
        if (url) {
          return url;
        }
      }
      return "";
    }
    if (typeof value === "object") {
      return (
        value.url ||
        value.fileUrl ||
        value.file_url ||
        value.downloadUrl ||
        value.download_url ||
        value.path ||
        ""
      );
    }
    return "";
  }

  function setMusicSource(musicRows) {
    const row = (musicRows || []).find(item => item.music);
    const url = row ? pickUrl(row.music) : "";
    const music = document.querySelector("#music");

    if (music && url && music.getAttribute("src") !== url) {
      music.setAttribute("src", url);
      music.load && music.load();
    }

    return url;
  }

  function buildErrorData(results) {
    return results.filter(row => row.result_type === "error").map(toUserArray);
  }

  function buildLeftUsers(users, luckyData, errorData) {
    const lotteredUser = {};
    Object.keys(luckyData).forEach(type => {
      luckyData[type].forEach(item => {
        lotteredUser[item[0]] = true;
      });
    });
    errorData.forEach(item => {
      lotteredUser[item[0]] = true;
    });
    return users.filter(user => !lotteredUser[user[0]]);
  }

  function loadAllData() {
    return Promise.all([
      list("lottery_user"),
      list("lottery_prize"),
      list("lottery_result"),
      list("lottery_config"),
      list("music")
    ]).then(([userRows, prizeRows, resultRows, configRows, musicRows]) => {
      const users = userRows.map(toUserArray);
      const orderedPrizes = prizeRows.slice().sort((a, b) => {
        return Number(a.sort_no || 0) - Number(b.sort_no || 0);
      });
      const luckyData = buildLuckyData(resultRows);
      const errorData = buildErrorData(resultRows);
      const companyConfig = configRows.find(row => {
        const key = String(row.key_name || "").toLowerCase();
        return key === "company" || key === "company_name" || key === "companyname";
      });
      const fallbackConfig = configRows.find(row => row.key_value);
      const companyName =
        (companyConfig && companyConfig.key_value) ||
        (fallbackConfig && fallbackConfig.key_value) ||
        "";
      const musicUrl = setMusicSource(musicRows);

      return {
        users,
        results: resultRows,
        cfgData: {
          prizes: orderedPrizes.map(toPrize),
          EACH_COUNT: orderedPrizes.map(row => row.each_count),
          COMPANY: companyName,
          MUSIC: musicUrl
        },
        luckyData,
        errorData,
        leftUsers: buildLeftUsers(users, luckyData, errorData)
      };
    });
  }

  function saveResult(type, data, resultType) {
    const rows = (data || []).map(item => {
      return {
        type,
        user_no: item[0],
        user_name: item[1],
        department: item[2],
        result_type: resultType
      };
    });
    return Promise.all(rows.map(row => add("lottery_result", row)));
  }

  function resetResults() {
    return list("lottery_result").then(rows => {
      return Promise.all(rows.map(row => remove("lottery_result", row.id)));
    });
  }

  function exportResults() {
    return Promise.all([list("lottery_prize"), list("lottery_result")]).then(
      ([prizeRows, resultRows]) => {
        const outData = [["工号", "姓名", "部门"]];
        prizeRows
          .slice()
          .sort((a, b) => Number(a.sort_no || 0) - Number(b.sort_no || 0))
          .forEach(prize => {
            outData.push([prize.text]);
            resultRows
              .filter(
                row =>
                  row.result_type === "lucky" &&
                  String(row.type) === String(prize.type)
              )
              .forEach(row => {
                outData.push(toUserArray(row));
              });
          });

        let blob;
        if (window.XLSX) {
          const workbook = window.XLSX.utils.book_new();
          const worksheet = window.XLSX.utils.aoa_to_sheet(outData);
          window.XLSX.utils.book_append_sheet(workbook, worksheet, "抽奖结果");
          const buffer = window.XLSX.write(workbook, {
            bookType: "xlsx",
            type: "array"
          });
          blob = new Blob([buffer], {
            type:
              "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          });
        } else {
          const csv = outData
            .map(row => row.map(cell => '"' + (cell || "") + '"').join(","))
            .join("\n");
          blob = new Blob(["\ufeff" + csv], {
            type: "text/csv;charset=utf-8"
          });
        }

        return {
          type: "success",
          url: URL.createObjectURL(blob)
        };
      }
    );
  }

  const handlers = {
    "/getUsers": function () {
      return list("lottery_user").then(rows => rows.map(toUserArray));
    },
    "/getTempData": function () {
      return loadAllData().then(data => {
        return {
          cfgData: data.cfgData,
          leftUsers: data.leftUsers,
          luckyData: data.luckyData
        };
      });
    },
    "/saveData": function (params) {
      return saveResult(params.type, params.data, "lucky").then(() => {
        return {
          type: "设置成功！"
        };
      });
    },
    "/errorData": function (params) {
      return saveResult(params.type, params.data, "error").then(() => {
        return {
          type: "设置成功！"
        };
      });
    },
    "/reset": function () {
      return resetResults().then(() => {
        return {
          type: "success"
        };
      });
    },
    "/export": exportResults
  };

  window.AJAX = function (opt) {
    opt = Object.assign(
      {
        data: {}
      },
      opt || {}
    );

    const handler = handlers[opt.url];
    if (!handler) {
      opt.error && opt.error(new Error("未支持的接口：" + opt.url));
      return;
    }

    handler(opt.data || {})
      .then(data => {
        opt.success && opt.success(data);
      })
      .catch(error => {
        console.error(error);
        opt.error && opt.error(error);
      });
  };
})();
