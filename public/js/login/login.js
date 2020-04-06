var login=document.getElementById('get-login'),
    user=document.getElementById('user'),
    password=document.getElementById('password'),
    message=document.getElementById('message'),
    loginURL=uri+'login';

loginSystem();

function loginSystem() {
  login.addEventListener('click', () => {
      userCheck();
  });
}

function hideAllModals () {
    const modals = document.querySelectorAll('.modal.is-shown')
    Array.prototype.forEach.call(modals, (modal) => {
        modal.classList.remove('is-shown')
    })
    showMainContent()
}
  
function showMainContent () {
    document.querySelector('.js-nav').classList.add('is-shown')
    document.querySelector('.js-content').classList.add('is-shown')
  }  


logoutResponse();

function logoutResponse() {
  document.querySelector('.logout').addEventListener("click", event => {
    //console.log(event);
    Cookies.remove('userInfo');
    Cookies.remove('rtpmsLogin');
    handleModalTrigger(event)
  });
}

