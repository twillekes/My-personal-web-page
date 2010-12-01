if (window.XMLHttpRequest)
  {
  xhttp=new XMLHttpRequest();
  }
else // IE 5/6
  {
  xhttp=new ActiveXObject("Microsoft.XMLHTTP");
  }
xhttp.open("GET","http://members.shaw.ca/twillekes/MainPage.xml",false);
xhttp.send();
xmlDoc=xhttp.responseXML;

// Or, if you have text
if (window.DOMParser)
  {
  parser=new DOMParser();
  xmlDoc=parser.parseFromString(text,"text/xml");
  }
else // Internet Explorer
  {
  xmlDoc=new ActiveXObject("Microsoft.XMLDOM");
  xmlDoc.async="false";
  xmlDoc.loadXML(text); 
  }

// To navigate to the parent node of "book"  
xmlDoc=loadXMLDoc("books.xml");

x=xmlDoc.getElementsByTagName("book")[0];
document.write(x.parentNode.nodeName);

// To check the node type
function get_nextSibling(n)
{
y=n.nextSibling;
while (y.nodeType!=1)
  {
  y=y.nextSibling;
  }
return y;
}

// Better yet, use JSON!

var jsonstr='{"name":"George", "age":29, "friends":["John", "Sarah", "Albert"]}'
var george=JSON.parse(jsonstr) //convert JSON string into object
alert(george.age) //alerts 29


// jQuery.getJSON(url, [data], [callback])
// See http://webhole.net/2009/11/28/how-to-read-json-with-javascript/