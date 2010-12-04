//var imageJson;
var imageList = new Array();
var numImages = 0;


function initializePage()
{
    loadImages();
}

function buildMenu()
{
    var theElement = document.getElementById("menuitems");
    if ( null == theElement )
        return;
    
    for ( index in imageList )
    {
        var adiv = document.createElement('div');
        adiv.innerHTML = "<input type=\"button\" value=\"" + imageList[index].metadata.subject + "\" onClick=\"switchTo('" +
                                                             imageList[index].metadata.subject + "');\">";
        
        theElement.appendChild(adiv);
        
        
        //var thediv = document.createElement('div');
        //thediv.innerHTML = "<img src=\"" + imageList[index].filePath + "\" class=\"thumbnailImage\"/>";
        
        //theElement.appendChild(thediv);
    }
    
    toWelcomeView();
}

function switchTo( imageClass )
{
    toImageView(imageClass);
}

function toWelcomeView()
{
    var theHTML =
     "\
            <!--\
             Front page mode\
              -->\
            <div id=\"titlearea\">\
                <h1 style=\"text-align: center;\">Magpie</h1>\
                <h2 style=\"text-align: center;\">Landscape and Nature Photography</h2>\
            </div>\
\
            <div id=\"welcome\">\
                <div class=\"centeredImage\">\
                     <br/>\
                    <img src=\"SampleImage.jpg\"/>\
                    <div id=\"welcomeimagedisplaydiv\"></div>\
                    <p style=\"text-align: center;\">This is where the welcome text will be</p>\
                </div>\
            </div>";
     
    var theElement = document.getElementById("contentplaceholder");
    theElement.innerHTML = theHTML;
}

function toImageView(imageClass)
{
    var theHTML =
     "\
            <!--\
             Image display mode\
              -->\
            <div id=\"thumbbar\">\
                <p  style=\"text-align: center;\">Image Category Name</p>\
                <div class=\"centeredImage\">\
                    <img src=\"SampleImage.jpg\" class=\"thumbnailImage\"/>\
                \
                    <div id=\"thumbdisplaydiv\"></div>\
                </div>\
            </div>\
            \
            <div id=\"copyrightfooter\">\
                <h3 style=\"text-align: center;\">Copyright 2003-2010 Tom Willekes</h3>\
            </div>\
            \
            <div id=\"imagedisplayarea\">\
                <div class=\"centeredImage\">\
                    <h3 style=\"text-align: center;\">Image Title Here</h3>\
                    <br/>\
                    <img src=\"SampleImage.jpg\"/>\
                    <div id=\"imagedisplaydiv\"></div>\
                </div>\
            </div>";
     
    var theElement = document.getElementById("contentplaceholder");
    theElement.innerHTML = theHTML;
    
    var theElement = document.getElementById("thumbdisplaydiv");
    if ( null == theElement )
        return;
        
    for ( index in imageList )
    {
        if ( imageClass != imageList[index].metadata.subject )
            continue;
            
        var thediv = document.createElement('div');
        thediv.innerHTML = "<img src=\"" + imageList[index].filePath + "\" class=\"thumbnailImage\"/>";
        
        theElement.appendChild(thediv);
    }
}

function loadImages()
{
    $.getJSON("images.json",
        function(json) {
            //alert("JSON Data: " + json.items[1].username);
            //imageJson = json;
            $.each(json.items,
                function(i,item)
                {
                    //alert(i+" "+item.filename+" "+item.title);
                    var md = new metadata( item.title, item.subject );
                    var ir = new imageRecord( item.filename, md );
                    imageList[numImages++] = ir;
                    
                    //var newdiv = document.createElement('div');
                    //newdiv.innerHTML = "<img src=\"" + item.filename + "\" class=\"thumbnailImage\"/>";
                    
                    //var theElement = document.getElementById("thumbdisplaydiv");
                    //theElement.appendChild(newdiv);
                    //theElement.innerHTML = "<img src=\"SampleImage4.jpg\"/>";
                }
                );
       
            buildMenu();
        }
     );
}

function metadata( title, subject )
{
    this.title = title;
    this.subject = subject;
}

function imageRecord( filePath, metadata )
{
    this.filePath = filePath;
    this.metadata = metadata;
}

