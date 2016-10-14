// 约定：
//  1. 数值全采用字符串形式，具体要用值的地方进行转换
//  2. localStrorage取得item使用getItem而不是点（.）
//  3. 能采用短变量的地方均定义短的局部变量
//  4. 局部函数均在所处函数的后部分

var helper = new Helper();

function Helper() {
  //常量定义
  var LOGSITEM = "logs";
  var LOGSPAGE = "logs.html";
  var LOGSDIVID = "logs";

  var isRun = false;

	this.isRunning = function() {
		return isRun;
	};

	//Logs
  var logsWindow = null;

	this.showlogs = function() {
    if (!logsWindow || logsWindow.closed) {
      var logs = localStorage.getItem(LOGSITEM);
      logsWindow = window.open(LOGSPAGE);
      logsWindow.onload = function() {
        if (logs) {
          logsWindow.$("#"+LOGSDIVID).html(logs);
          logsWindow.scrollTo(0, logsWindow.document.body.scrollHeight);
        }
      };
    }
    logsWindow.focus();
	};

  this.clearlogs = function() {
    localStorage.removeItem(LOGSITEM);
    if (logsWindow && !logsWindow.closed) {
      logsWindow.$("#"+LOGSDIVID).html("");
    }
  };

  function log(str) {
    if (!isRun) {
      return;
    }

    var date = new Date();
    var time = timeFormat("YY-MM-DD hh:mm:ss  ", date);
    var logs = localStorage.getItem(LOGSITEM);

    str = time + str + "<br/>";
    if (logs) {
      logs += str;
    } else {
      logs = str;
    }
    localStorage.setItem(LOGSITEM, logs);

    if (logsWindow && !logsWindow.closed && 
        logsWindow.document.readyState == "complete") {
      logsWindow.$("#"+LOGSDIVID).append(str);
      logsWindow.scrollTo(0, logsWindow.document.body.scrollHeight);
    }
  }

  //开关控制
  var start = this.start = function() {
    isRun = true;
    log("+++++++++++++++++++++++START+++++++++++++++++++++++++++++");
    restart();
  };

  var stop = this.stop = function() {
    shutdown();
    log("+++++++++++++++++++++++E N D+++++++++++++++++++++++++++++");
    isRun = false;
  };

  //进程控制，利用step实现在异步下的顺序执行
  var RETRYTIME = 10000;

  var step = 0;
  var steps = [init, showStatus, gym, crimes];
  var runId = null;
  var nexttime = 0;
  
  function run() {
    if (!isRun) {
      return;
    }

    if (step < steps.length) {
      steps[step]();
    } else {
      step = 0;
      if (nexttime == 0) {
        log("未开启任何功能，将只进行状态查看！");
        nexttime = RETRYTIME;
      }
      var time = dateAddMs(new Date(), nexttime);
      log("下次处理时间：" + timeFormat("hh:mm:ss", time));
      retry(nexttime);
    }
  }

  function restart() {
    step = 0;
    run();
  }

  function shutdown() {
    if (runId > 0) {
      clearTimeout(runId);
    }
  }

  function retry(time) {
    if (time == undefined) {
      time = RETRYTIME;
    }
    runId = setTimeout(run, time);
  }

  function nextStep(time) {
    if (time) {
      setNexttime(time);
    }
    step++;
    runId = setTimeout(run, 0);
  }

  //这里的time是以毫秒计
  function setNexttime(time) {
    if (nexttime == 0 || time < nexttime) {
      nexttime = time;
    }
  }

  //执行过程
  var TORNURL = "http://www.torn.com";

  var status = null;
  var pagecache = null;

  function init() {
    log("初始化...");
    ajaxConnect(
      TORNURL + "/index.php",
      function(html) {
        storePage("index", html);
        if (isLogined()) {
          log("登录成功！");
          initStatus();
          nextStep(0);
        } else {
          log("没有登录，请登录以后启动！");
          stop();
        }
      });

    function isLogined() {
      if (haveWords(pagecache["html"], "Error")) {
        return false;
      } else {
        return true;
      }
    }

    function initStatus() {
      var html = pagecache["html"];

      status = {
        "money": getMoney(html),
        "energy": getStatus(html, "Energy"),
        "nerve": getStatus(html, "Nerve"),
        "happy": getStatus(html, "Happy"),
        "life": getStatus(html, "life"),
      }

      function getMoney(html) {
        var money = "";

        if ($(html).find("#FtcMA")) {
          money = $(html).find("#FtcMA").children(".m-hide").html();
        } else {
          log("无法获取状态信息，将稍后重启");
          retry();
        }
        return money;
      }

      function getStatus(html, status) {
        var current = "";
        var total = "";
        var time = "";

        if ($(html).find("#"+status.toLowerCase())) {
          var statusNode = $(html).find("#"+status.toLowerCase());
          var countNode = statusNode.children(".count.left");
          var timeNode = statusNode.children(".time.right");

          current = countNode.attr("data-current");
          total = countNode.attr("data-total");
          time = timeNode.children(".bar-status").html();
        } else {
          log("无法获取状态信息，将稍后重启");
          retry();
        }
        return {
          "current": current,
          "total": total,
          "time": time,
        }
      }
    }
  }
  
  function showStatus() {
    var s = ["Energy", "Nerve", "Happy", "Life"];

    log("查看状态...");
    log("Money: " + status["money"]);
    for (index in s) {
      var sn = s[index];
      var sv = status[sn.toLowerCase()];

      log(sn + ": " + sv.current + "/" + sv.total + ", Full-Time: " + sv.time);
    }
    nextStep(0); 
  }

  function gym() {
    var gymEnabled = localStorage.getItem("gymEnabled");
    var energy = status["energy"];

    if (gymEnabled == "true") {
      var target = 0;

      log("准备锻炼...");
      if (energy["current"] > target) {
        //当验证通过后会缓存页面以减少请求
        if (pagecache["name"] == "gym") {
          train();
        } else {
          ajaxConnect(
            TORNURL + "/gym.php",
            function(html) {
              storePage("gym", html);
              if (isValidated()) {
                train();
              } else {
                log("需要验证，停止当前操作！");
                validate(TORNURL + "/gym.php", "gym");
              }
            });
        }
      } else {
        log("当前能量不足，执行下一项！");
        nextStep(300*60*1000);
      }
    } else {
      nextStep(0);
    }

    function train() {
      log("开始锻炼...");

      chrome.cookies.get({
          url: TORNURL,
          name: "rfc_v"
        },
        function(data) {
          var rfcv = "";
          var q = localStorage.getItem("q");
          var t = 30;

          if (data) {
            rfcv = data.value;
          }
          if (!q) {
            q = "1";
          }

          ajaxConnect(
            TORNURL + "/gym.php",
            function(html) {
              log("锻炼成功！");
              nextStep(300*60*1000);
            },
            "GET",
            {
              "step": "embeddedgym2",
              "rfcv": rfcv,
              "q": q,
              "t": t
            },
            {
              "X-Requested-With": "XMLHttpRequest"
            });
        });
    }
  }

  function crimes() {
    var crimeEnabled = localStorage.getItem("crimeEnabled");
    var nerve = status["nerve"];
    var nervetake = localStorage.getItem("nervetake");
    var crime = localStorage.getItem("crime");

    if (crimeEnabled == "true") {
      log("准备作案..." + crime + "(" + nervetake + ")");
      if (parseInt(nerve["current"]) >= parseInt(nervetake)) {
        //当验证通过后会缓存页面以减少请求
        if (pagecache["name"] == "crimes") {
          doCrime();
        } else {
          ajaxConnect(
            TORNURL + "/crimes.php",
            function(html) {
              storePage("crimes", html);
              if (isValidated()) {
                doCrime();
              } else {
                log("需要验证，停止当前操作！");
                validate(TORNURL + "/crimes.php", "crimes");
              }
            });
        }
      } else {
        log("当前胆势不足，执行下一项！");
        nextStep((nerve["total"]-nerve["current"])*5*60*1000);
      }
    } else {
      nextStep(0);
    }

    function doCrime() {
      var crimestep = nervetake < 4 ? "docrime2" : "docrime4";

      log("开始作案...");
      chrome.cookies.get({
          url: TORNURL,
          name: "rfc_v"
        },
        function(data) {
          var rfcv = "";

          if (data) {
            rfcv = data.value;
          }

          ajaxConnect(
            TORNURL + "/crimes.php",
            function(html) {
              storePage("crimes", html);
              status["nerve"]["current"] -= nervetake;
              if (haveWords(html, "success-message")) {
                log("作案成功！");
              } else if (haveWords(html, "ready-message")) {
                log("作案撤退！");
              } else if (haveWords(html, "error-message")) {
                log("作案失败！");
              } else {
                log("未知状态！");
              }
              crimes();
            },
            "GET",
            {
              "step": crimestep,
              "rfcv": rfcv,
              "nervetake": nervetake,
              "crime": crime
            },
            {
              "X-Requested-With": "XMLHttpRequest"
            });
        });
    }
  }

  function storePage(name, html) {
    pagecache = {
      "name": name,
      "html": html,
    };
  }
  
  function isValidated() {
    if (haveWords(pagecache["html"], "Please Validate")) {
      return false;
    } else {
      return true;
    }
  }

  var answer = null;
  var validateURL = TORNURL + "/gym.php";
  var validateNAME = "gym";

  function validate(url, name) {
    if (url) {
      validateURL = url;
      validateNAME = name;
    }
    if (answer === null) {
      var html = pagecache["html"];
      var textBox = $(html).find("#text");
      var title = textBox.find(".title").html().trim();
      var answers = [];
      var str = "问题：" + title + " 候选答案：";

      textBox.find("[name=textword]").each(function(index, value) {
        answers.push($(value).attr("value"));
        str += answers[index];
        if (index < 5) {
          str += ", ";
        }
      });
      log(str);
      getAnswer(title, answers);
    } else {
      ajaxConnect(
        validateURL,
        function(html) {
          answer = null;
          storePage(validateNAME, html);
          if (isValidated()) {
            log("验证成功，将重新执行停止的操作！");
            retry(0);
          } else {
            log("验证失败，请手动验证！");
            stop();
          }
        },
        "POST",
        {
          textword: answer
        });
    }
  }

  var ANSWERURL = "http://www.aier.tech/index.php?m=home&c=index&a=getanswer";

  function getAnswer(question, answers) {
    log("获取答案...");
    ajaxConnect(
      ANSWERURL,
      function(response) {
        if (response) {
          log("获得答案：" + response);
          answer = response;
          validate();
        } else {
          log("不知道答案，稍后重新获取！");
          setTimeout(function() {
            getAnswer(question, answers);
          }, 10*60*1000);
        }
      },
      "POST",
      {
        "question": question,
        "choice1": answers[0],
        "choice2": answers[1],
        "choice3": answers[2],
        "choice4": answers[3],
        "choice5": answers[4],
        "choice6": answers[5],
      });
  }

  //tools
  var TIMEOUT = 10000;

  function timeFormat(format, date) {
    var time = {
      "YY": date.getFullYear(),
      "MM": date.getMonth() + 1,
      "DD": date.getDate(),
      "hh": date.getHours(),
      "mm": date.getMinutes(),
      "ss": date.getSeconds(),
    }

    for (item in time) {
      if (item != "YY") {
        if (time[item] < 10) {
          time[item] = "0" + time[item];
        }
      }
      format = format.replace(item, time[item]);
    }

    return format;
  }

  function dateAddMs(date, ms) {
    var h = ms / 3600000;
    var m = ms % 3600000 / 60000;
    var s = ms % 60000 / 1000;
    var hh = date.getHours();
    var mm = date.getMinutes();
    var ss = date.getSeconds();

    ss += s;
    if (s >= 60) {
      mm += 1;
      ss %= 60;
    }
    mm += m;
    if (mm >= 60) {
      hh += 1;
      mm %= 60;
    }
    hh += h;
    if (hh >= 24) {
      hh %= 24;
    }
    date.setHours(hh);
    date.setMinutes(mm);
    date.setSeconds(ss);

    return date
  }

  function haveWords(str, words) {
    return (str.indexOf(words) >= 0);
  }

  function ajaxConnect(url, func, method, data, headers) {
    if (method == undefined) {
      method = "GET";
    }
    if (data == undefined) {
      data = null;
    }
    if (headers == undefined) {
      headers = null;
    }

    if (method == "GET" && data) {
      var i = 0;
      for (key in data) {
        if (i > 0) {
          url += "&";
        } else {
          url += "?";
        }
        url += key + "=" + data[key];
      }
    }

    $.ajax({
      url: url,
      type: method,
      headers: headers,
      data: data,
      dataType: "text",
      timeout: TIMEOUT,
      success: func,
      error: function() {
        log("网络错误，稍后重试！");
        retry();
      }
    });
  }
}