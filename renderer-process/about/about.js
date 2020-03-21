const Cookies = require("js-cookie");
document.getElementById('product-name').innerHTML = '放射治疗计划系统数据全自动备份系统'
document.getElementById('product-version').innerHTML = '0.0.1'
var login=document.getElementById('get-started'),
    user=document.getElementById('user'),
    password=document.getElementById('password'),
    message=document.getElementById('message')
    loginURL='http://192.168.1.16:3000/login';

loginSystem();

function loginSystem() {
    login.addEventListener('click', () => {
        userCheck();
    });
}

// user功能
function userCheck(){
    userData={
        loginName:user.value,
        password:password.value
    }

    if(userData.loginName==undefined||userData.loginName==null||userData.password==undefined||userData.password==null){
        var errMessage = "输入的用户名或者密码不能为空，请重新输入。";
        message.innerHTML=errMessage;
    }else{
        var errMessage = "输入的用户名或者密码错误，请重新输入。";
        const xhr = new XMLHttpRequest();
        xhr.open('POST', loginURL);
        xhr.setRequestHeader('Content-Type', 'application/json; charset=UTF-8');
        xhr.onreadystatechange = function() {
            if (xhr.readyState !== 4) {
                return;
            }
            if (xhr.status >= 200 && xhr.status < 300 || xhr.status === 304) {
                Cookies.set('rtpmsLogin',true)
                if(xhr.response!="[]") hideAllModals ()
            } else {
                console.log(xhr);
                message.innerHTML=errMessage;
            }
        };
        xhr.send(JSON.stringify(userData));
    }
}

function showMainContent () {
    document.querySelector('.js-nav').classList.add('is-shown')
    document.querySelector('.js-content').classList.add('is-shown')
  }  

function hideAllModals () {
    const modals = document.querySelectorAll('.modal.is-shown')
    Array.prototype.forEach.call(modals, (modal) => {
        modal.classList.remove('is-shown')
    })
    showMainContent()
}
  
