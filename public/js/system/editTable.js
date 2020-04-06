const wordTable = {
	male: "男", female: "女", other: "其他",
	Administrator: "管理员", Planner: "剂量师", Physicist: "物理师",
	Solaris: 'Solaris', Windows: 'Windows', Linux: 'Linux', 'Mac OS': 'Mac OS',
	NodeServer: '节点服务器', PlanningServer: '计划服务器', StandaloneServer: '独立服务器', BackupServer: '备份服务器'
  };
  
const editTable = function(){
	for(var i=0;i<arguments.length;i++){
	   setTableCanEdit(arguments[i]);
	}
}

//设置表格是可编辑的
const setTableCanEdit = function(table){
	for(var i=1; i<table.rows.length;i++){
	   setRowCanEdit(table.rows[i]);
	}
}

const setRowCanEdit = function(row){
	for(var j=0;j<row.cells.length; j++){	
		//如果当前单元格指定了编辑类型，则表示允许编辑
		var editType = row.cells[j].getAttribute("editType");
		if(!editType){
			//如果当前单元格没有指定，则查看当前列是否指定
			editType = row.parentNode.rows[0].cells[j].getAttribute("editType");
		}
		if(editType){
			row.cells[j].onclick = function (){
				editCell(this);
			}
		}
	}

}

//设置指定单元格可编辑
const editCell = function(element, editType){

	var editType = element.getAttribute("editType");
	//console.log(element.parentNode.parentNode.rows[0].cells[element.cellIndex].getAttribute("editType"))
	if(!editType){
	   //如果当前单元格没有指定，则查看当前列是否指定
	   editType = element.parentNode.parentNode.rows[0].cells[element.cellIndex].getAttribute("editType");
	}

	switch(editType){
		case "textBox":
		createTextBox(element, element.value);
		break;
		case "password":
		createPasswdBox(element, element.value);
		break;
		case "dropDownList":
		createDropDownList(element, element.value);
		break;
		default:
		break;
	}
}

//为单元格创建可编辑输入框
const createTextBox = function(element, value){
	//检查编辑状态，如果已经是编辑状态，跳过
	var editState = element.getAttribute("editState");
	if(editState != "true"){
		//创建文本框
		var textBox = document.createElement("INPUT");
		textBox.type = "text";
		textBox.className="EditCell_TextBox";
		textBox.style.height = element.parentNode.style.height;
		textBox.width = element.parentNode.width;
		
		//设置文本框当前值
		if(!value){
			value = element.getAttribute("Value");
		}  
		textBox.value = value;
		
		//设置文本框的失去焦点事件
		textBox.onblur = function (){
			cancelEditCell(this.parentNode, this.value,"text");
		}
		//向当前单元格添加文本框
		clearChild(element);
		element.appendChild(textBox);
		textBox.focus();
		textBox.select();
		
		//改变状态变量
		element.setAttribute("editState", "true");
		element.parentNode.parentNode.setAttribute("CurrentRow", element.parentNode.rowIndex);
	}

}

//为单元格创建密码输入框
const createPasswdBox = function(element, value){
	//检查编辑状态，如果已经是编辑状态，跳过
	var editState = element.getAttribute("editState");
	if(editState != "true"){
		//创建文本框
		var PasswdBox = document.createElement("INPUT");
		PasswdBox.type = "password";
		PasswdBox.className="EditCell_PasswdBox";
		PasswdBox.style.height = element.parentNode.style.height;
		PasswdBox.width = element.parentNode.width;
		
		//设置文本框当前值
		if(!value){
			value = element.getAttribute("Value");
			console.log(value)
		}  
		PasswdBox.value = value;
		
		//设置文本框的失去焦点事件
		PasswdBox.onblur = function (){
			cancelEditCell(this.parentNode, this.value,"password");
		}
		//向当前单元格添加文本框
		clearChild(element);
		element.appendChild(PasswdBox);
		PasswdBox.focus();
		PasswdBox.select();
		
		//改变状态变量
		element.setAttribute("editState", "true");
		element.parentNode.parentNode.setAttribute("CurrentRow", element.parentNode.rowIndex);
	}

}

//为单元格创建选择框
const createDropDownList = function(element, value){
	//检查编辑状态，如果已经是编辑状态，跳过 
	var editState = element.getAttribute("editState");
	if(editState != "true"){
		//创建下接框
		var downList = document.createElement("Select");
		downList.className="EditCell_DropDownList";
		downList.style.height = element.parentNode.style.height;
		downList.width = element.parentNode.width;
	
		//添加列表项
		var items = element.getAttribute("dataItems");
		if(!items){
			items = element.parentNode.parentNode.rows[0].cells[element.cellIndex].getAttribute("dataItems");
		}
	
		if(items){
			items = eval("[" + items + "]");
			for(var i=0; i<items.length; i++){
				var oOption = document.createElement("OPTION");
				oOption.text = items[i].text;
				oOption.value = items[i].value;
				downList.options.add(oOption);
			}
		}
	
		//设置列表当前值
		if(!value){
			value = element.getAttribute("Value");
		}
		downList.value = value;
	
		//设置创建下接框的失去焦点事件
		downList.onblur = function (){
			cancelEditCell(this.parentNode, this.value, "dropdownList");
		}
	
		//向当前单元格添加创建下接框
		clearChild(element);
		element.appendChild(downList);
		downList.focus();
		
		//记录状态的改变
		element.setAttribute("editState", "true");
		element.parentNode.parentNode.setAttribute("LastEditRow", element.parentNode.rowIndex);
	}

}

//取消单元格编辑状态
const cancelEditCell = function(element, value, editType){
	element.value=value
	element.setAttribute("Value", value);
	if(editType=="password"){
		element.innerHTML = "********";
	}else if(editType=="dropdownList"){
		element.innerHTML = wordTable[value];
	}else{
		element.innerHTML = value;
	}
	element.setAttribute("editState", "false");

	//检查是否有公式计算
	checkExpression(element.parentNode);
}

//清空指定对象的所有字节点
function clearChild(element){
	element.innerHTML = "";
}

//添加行
const addRow = function(table, index){
	var lastRow = table.rows[table.rows.length-1];
	var newRow = lastRow.cloneNode(true);
	table.tBodies[0].appendChild(newRow);
	newRow.cells[0].value=newRow.parentNode.rows.length-1
	//console.log(newRow.cells[0].value)
	for(var i = 1;i< newRow.cells.length-1;i++){
		newRow.cells[i].value=newRow.parentNode.rows[newRow.parentNode.rows.length-2].cells[i].value
	}
	setRowCanEdit(newRow);
	return newRow;
}

//删除行
const deleteRow = function(table, index){
	for(var i=table.rows.length - 1; i>0;i--){
		var chkOrder = table.rows[i].cells[0].firstChild;
		if(chkOrder){
			if(chkOrder.type = "CHECKBOX"){
				if(chkOrder.checked){
					//执行删除
					table.deleteRow(i);
				}
			}
		}
	}
}

//提取表格的值,JSON格式
const getTableData = function(table){
	var tableData = new Array();
	//alert("行数：" + table.rows.length);
	for(var i=1; i<table.rows.length;i++){
		tableData.push(getRowData(table.rows[i]));
	}
	return tableData;
}

//提取指定行的数据，JSON格式
const getRowData = function(row){
	var rowData = {};
	for(var j=0;j<row.cells.length-1; j++){
		name = row.parentNode.rows[0].cells[j].value//getAttribute("Name");
		//if(name){
			// var value = row.cells[j].getAttribute("Value");
			// if(!value){
			// 	value = row.cells[j].innerHTML;
			// }
			rowData[name] = row.cells[j].value;
		//}
	}
	//alert("ProductName:" + rowData.ProductName);
	//或者这样：alert("ProductName:" + rowData["ProductName"]);
	return rowData;
}

//检查当前数据行中需要运行的字段
const checkExpression = function(row){
	for(var j=0;j<row.cells.length; j++){
		expn = row.parentNode.rows[0].cells[j].getAttribute("Expression");
		//如指定了公式则要求计算
		if(expn){
			var result = expression(row,expn);
			var format = row.parentNode.rows[0].cells[j].getAttribute("Format");
			if(format){
				//如指定了格式，进行字值格式化
				row.cells[j].innerHTML = formatNumber(Expression(row,expn), format);
			}else{
				row.cells[j].innerHTML = Expression(row,expn);
			}
		}
	}
}

//计算需要运算的字段
const expression = function(row, expn){
	var rowData = getRowData(row);
	//循环代值计算
	for(var j=0;j<row.cells.length; j++){
		name = row.parentNode.rows[0].cells[j].getAttribute("Name");
		if(name){
			var reg = new RegExp(name, "i");
			expn = expn.replace(reg, rowData[name].replace(/\,/g, ""));
		}
	}
	return eval(expn);
}

///////////////////////////////////////////////////////////////////////////////////
/** 
* 格式化数字显示方式   
* 用法 
* formatNumber(12345.999,'#,##0.00'); 
* formatNumber(12345.999,'#,##0.##'); 
* formatNumber(123,'000000'); 
* @param num 
* @param pattern 
*/ 
/* 以下是范例
formatNumber('','')=0
formatNumber(123456789012.129,null)=123456789012
formatNumber(null,null)=0
formatNumber(123456789012.129,'#,##0.00')=123,456,789,012.12
formatNumber(123456789012.129,'#,##0.##')=123,456,789,012.12
formatNumber(123456789012.129,'#0.00')=123,456,789,012.12
formatNumber(123456789012.129,'#0.##')=123,456,789,012.12
formatNumber(12.129,'0.00')=12.12
formatNumber(12.129,'0.##')=12.12
formatNumber(12,'00000')=00012
formatNumber(12,'#.##')=12
formatNumber(12,'#.00')=12.00
formatNumber(0,'#.##')=0
*/
const formatNumber = function(num,pattern){
	var strarr = num?num.toString().split('.'):['0'];   
	var fmtarr = pattern?pattern.split('.'):[''];   
	var retstr='';   
	   
	// 整数部分   
	var str = strarr[0];   
	var fmt = fmtarr[0];   
	var i = str.length-1;     
	var comma = false;   
	for(var f=fmt.length-1;f>=0;f--){   
		switch(fmt.substr(f,1)){   
			case '#':   
			if(i>=0 ) retstr = str.substr(i--,1) + retstr;   
			break;   
			case '0':   
			if(i>=0) retstr = str.substr(i--,1) + retstr;   
			else retstr = '0' + retstr;   
			break;   
			case ',':   
			comma = true;   
			retstr=','+retstr;   
			break;   
		}   
	}   
	
	if(i>=0){   
		if(comma){   
			var l = str.length;   
			for(;i>=0;i--){   
				retstr = str.substr(i,1) + retstr;   
				if(i>0 && ((l-i)%3)==0) retstr = ',' + retstr;    
			}   
		}   
		else retstr = str.substr(0,i+1) + retstr;   
	}   
	   
	retstr = retstr+'.';   
	// 处理小数部分   
	str=strarr.length>1?strarr[1]:'';   
	fmt=fmtarr.length>1?fmtarr[1]:'';   
	i=0;   
	for(var f=0;f<fmt.length;f++){   
		switch(fmt.substr(f,1)){   
			case '#':   
			if(i<str.length) retstr+=str.substr(i++,1);   
			break;   
			case '0':   
			if(i<str.length) retstr+= str.substr(i++,1);   
			else retstr+='0';   
			break;   
		}   
	}
	return retstr.replace(/^,+/,'').replace(/\.$/,'');  
}