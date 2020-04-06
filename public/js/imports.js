const tpls = document.querySelectorAll('.task-template')
  // console.log(tpls.length)
// Import and add each page to the DOM
Array.prototype.forEach.call(tpls, (tpl) => {
  // console.log(tpl.content.childNodes[1])
  let clone = document.importNode(tpl.content, true).childNodes[1]
  if (clone.classList.contains('modal')) {
    document.querySelector('body').appendChild(clone)
  } else {
    document.querySelector('.content').appendChild(clone)
  }
})
