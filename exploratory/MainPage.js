

// Cool CSS Menu- By JavaScriptKit.com (http://www.javascriptkit.com)
// For this and over 400+ free scripts, visit JavaScript Kit- http://www.javascriptkit.com/
// Fading routine based on Dynamic Drive script: http://www.dynamicdrive.com/dynamicindex4/highlightgrad.htm
// This notice must stay intact for use

var baseopacity=0

function showtext(thetext){
if (!document.getElementById)
return
textcontainerobj=document.getElementById("tabledescription")
browserdetect=textcontainerobj.filters? "ie" : typeof textcontainerobj.style.MozOpacity=="string"? "mozilla" : ""
instantset(baseopacity)
document.getElementById("tabledescription").innerHTML=thetext
highlighting=setInterval("gradualfade(textcontainerobj)",50)
}

function hidetext(){
cleartimer()
instantset(baseopacity)
}

function instantset(degree){
if (browserdetect=="mozilla")
textcontainerobj.style.MozOpacity=degree/100
else if (browserdetect=="ie")
textcontainerobj.filters.alpha.opacity=degree
else if (document.getElementById && baseopacity==0)
document.getElementById("tabledescription").innerHTML=""
}

function cleartimer(){
if (window.highlighting) clearInterval(highlighting)
}

function gradualfade(cur2){
if (browserdetect=="mozilla" && cur2.style.MozOpacity<1)
cur2.style.MozOpacity=Math.min(parseFloat(cur2.style.MozOpacity)+0.2, 0.99)
else if (browserdetect=="ie" && cur2.filters.alpha.opacity<100)
cur2.filters.alpha.opacity+=20
else if (window.highlighting)
clearInterval(highlighting)
}
