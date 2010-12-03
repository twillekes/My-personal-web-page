

function loadImages()
{
    $.getJSON("images.json",
        function(json) {
            //alert("JSON Data: " + json.items[1].username);
            $.each(json.items,
                function(i,item)
                {
                    alert(i+" "+item.filename+" "+item.title);
                    
                    var newdiv = document.createElement('div');
                    newdiv.innerHTML = "<img src=\"" + item.filename + "\" class=\"thumbnailImage\"/>";
                    
                    var theElement = document.getElementById("thumbdisplaydiv");
                    theElement.appendChild(newdiv);
                    //theElement.innerHTML = "<img src=\"SampleImage4.jpg\"/>";
                }
                );
     }
     );
}
