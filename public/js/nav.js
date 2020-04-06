// const Cookies = require('./js.cookie.js');

document.body.addEventListener('click', (event) => {
  // console.log(event)
  if (event.target.dataset.section) {
    handleSectionTrigger(event)
  } else if (event.target.dataset.modal) {
    handleModalTrigger(event);
  } else if (event.target.classList.contains('modal-hide')) {  
    hideAllModals();
  } else if (event.target.classList.contains('modal-login')) {  
    userCheck();
  }else if(event.target.classList.contains('logout')){    
    Cookies.remove('userInfo');
    Cookies.remove('rtpmsLogin');
    Cookies.remove('activeSectionButtonId');
    displayLogin()
  }
})

function handleSectionTrigger (event) {
  hideAllSectionsAndDeselectButtons()

  // Highlight clicked button and show view
  event.target.classList.add('is-selected')

  // Display the current section
  const sectionId = `${event.target.dataset.section}-section`
  document.getElementById(sectionId).classList.add('is-shown')

  // Save currently active button in localStorage
  const buttonId = event.target.getAttribute('id')
  Cookies.set('activeSectionButtonId', buttonId)
}

function activateDefaultSection () {
  document.getElementById('button-institution-data').click()
}

function showMainContent () {
  document.querySelector('.js-nav').classList.add('is-shown')
  document.querySelector('.js-content').classList.add('is-shown')
}

function handleModalTrigger (event) {
  hideAllModals()
  const modalId = `${event.target.dataset.modal}-modal`
  document.getElementById(modalId).classList.add('is-shown')
}

function hideAllModals () {
  const modals = document.querySelectorAll('.modal.is-shown')
  Array.prototype.forEach.call(modals, (modal) => {
    modal.classList.remove('is-shown')
  })
  showMainContent()
}

function hideAllSectionsAndDeselectButtons () {
  const sections = document.querySelectorAll('.js-section.is-shown')
  Array.prototype.forEach.call(sections, (section) => {
    section.classList.remove('is-shown')
  })

  const buttons = document.querySelectorAll('.nav-button.is-selected')
  Array.prototype.forEach.call(buttons, (button) => {
    button.classList.remove('is-selected')
  })
}

function displayAbout () {
  document.querySelector('#about-modal').classList.add('is-shown')
}

function displayLogin () {
  document.querySelector('#login-modal').classList.add('is-shown')
  document.getElementById('message').innerHTML='';
  document.getElementById('user').value='';
  document.getElementById('password').value='';
}

// Default to the view that was active the last time the app was open
const sectionId = Cookies.get('activeSectionButtonId')
if (sectionId) {
  showMainContent()
  const section = document.getElementById(sectionId)
  if (section) section.click()
} else {
  activateDefaultSection()
  displayLogin()
}

// user功能

function userCheck(){
  var login=document.getElementById('get-started'),
    user=document.getElementById('user'),
    password=document.getElementById('password'),
    message=document.getElementById('message'),
    userData={
        loginName:user.value,
        password:password.value
    },
    loginURL=uri+"login";

// console.log(userData.loginName=='')
  if(userData.password==''||userData.password==''){
      message.innerHTML="输入的用户名或者密码不能为空，请重新输入。";
  }else{
      const xhr = new XMLHttpRequest();
      xhr.open('POST', loginURL);
      xhr.setRequestHeader('Content-Type', 'application/json; charset=UTF-8');
      xhr.onreadystatechange = function() {
          if (xhr.readyState !== 4) {
              return;
          }
          if (xhr.status >= 200 && xhr.status < 300 || xhr.status === 304) {
            if(xhr.response!="[]"){
              Cookies.set('rtpmsLogin',true)
              var userLogin = JSON.parse(xhr.response)[0]
              hideAllModals ()
              Cookies.set('userInfo',userLogin)
              document.getElementById('user-info').innerHTML = userLogin.userName;
            }else{
              message.innerHTML="输入的用户名或者密码错误，请重新输入。";
            }
          } else {
              console.log(xhr);
          }
      };
      xhr.send(JSON.stringify(userData));
  }
}