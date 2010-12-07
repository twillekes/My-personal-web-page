// Page load actions
var loadParameters;

// Master list of images
var totalNumImages = 0;
var imageList = new Array();

// Category management
var currentCategorization = "subject";
var categoryList = new Array();
var currentlySelectedImage = null;

/*

Image categories:
- Subject
- Season
- Camera
- Lens
- Film
- Monochrome
- Format (35mm, 6x4.5, 6x6, 6x7, 6x9, 6x12, 4x5)
- Year captured (2003 through 2010)

Image information:
- File name
- Title
- Favorite (yes/no)
- New (yes/no)
- Description/notes
- Rating (1-10)
- Date captured

*/

window.onload = initializePage();

function initializePage()
{
    loadParameters = getParams();
    
    loadImages();
}

function getParams()
{
    var idx = document.URL.indexOf('?');
    if ( idx == -1 )
        return;
    
    var tempParams = new Object();
    var pairs = document.URL.substring(idx+1,document.URL.length).split('&');
    for (var i=0; i<pairs.length; i++)
    {
        nameVal = pairs[i].split('=');
        tempParams[nameVal[0]] = nameVal[1];
    }
    return tempParams;
}


function buildMenu()
{
    findCategories();
    
    var theElement = document.getElementById("menuitems");
    if ( null == theElement )
        return;
    
    for ( index in categoryList )
    {
        var adiv = document.createElement('div');
        var extra = "images";
        if ( categoryList[index].numImages == 1 )
            extra = "image";
            
        adiv.innerHTML = "<input type=\"button\" value=\"" + categoryList[index].categoryValue + "\" onClick=\"switchTo('" +
                                                             categoryList[index].categoryValue + "');\" class=\"menuButton\" onMouseOver=\"showText('" +
                                                             categoryList[index].numImages + " " + extra +
                                                             "','buttonDescription');\" onMouseOut=\"hideText('buttonDescription')\" />";
        
        theElement.appendChild(adiv);
    }
    
    for ( index in loadParameters )
    {
        if ( index == "showImage" )
        {
            toSingleImageView(loadParameters[index]);
            return;
        }
    }

    toWelcomeView();
}

function toSingleImageView(filePath)
{
    var imageTitle = null;
    for ( index in imageList )
    {
        if ( imageList[index].filePath == filePath )
        {
            imageTitle = imageList[index].metadata.title;
            break;
        }
    }
    
    if ( imageTitle == null )
    {
        filePath = imageList[0].filePath;
        imageTitle = imageList[0].metadata.title;
    }
    
    theHTML = getCopyrightAndImageDisplayHTML();
     
    var theElement = document.getElementById("contentplaceholder");
    theElement.innerHTML = theHTML;

    var titleHTML = "<h3 id=\"imagetitlearea\">" + imageTitle + "</h3>";
    var theElement = document.getElementById("imagetitlediv");
    if ( null == theElement )
        return;
        
    theElement.innerHTML = titleHTML;
    
    theElement = document.getElementById("imagedisplaydiv");
    if ( null == theElement )
        return;
        
    var theHTML = "<img src=\"" + filePath + "\" id=\"displayedimage\"/>";
    theElement.innerHTML = theHTML;
}

function switchTo( categoryValue )
{
    toImageView(categoryValue);
}

function toWelcomeView()
{
    var theHTML =
     "\
            <!--\
             Front page mode\
              -->\
            <div id=\"titlearea\">\
                <h1 style=\"text-align: center; margin: 0; padding: 0;\">Magpie</h1>\
                <h2 style=\"text-align: center; margin: 0; padding: 0;\">Landscape and Nature Photography</h2>\
            </div>\
            <div id=\"welcome\">\
                <div class=\"centeredImage\">\
                     <br/>\
                    <div id=\"welcomeimagedisplaydiv\"></div>\
                </div>\
                <iframe src=\"welcomeText.html\" frameborder=\"0\" id=\"welcometextdiv\"></iframe>\
            </div>";
     
    var theElement = document.getElementById("contentplaceholder");
    theElement.innerHTML = theHTML;
    
    showRandomWelcomeImage();
}

function getCopyrightAndImageDisplayHTML()
{
    var theCopyrightFooter =
     "      <div id=\"copyrightfooter\">\n\
                <h3 style=\"text-align: center; margin: 0 0 0 0;\">Image Copyright 2003-2010 Tom Willekes</h3>\n\
            </div>\n";
     
    var theImageDisplayArea =
     "      <div id=\"imagedisplayarea\">\n\
                <div class=\"centeredImage\">\n\
                    <div id=\"imagetitlediv\"></div>\n\
                    <div id=\"imagedisplaydiv\"></div>\n\
                </div>\n\
            </div>\n";  
            
    return theCopyrightFooter + theImageDisplayArea;
}

function toImageView(categoryValue)
{
    var theCategoryNameArea =
    "       <div id=\"categorynamearea\">\n\
                <h3  style=\"text-align: center; margin: 0 0 0 0;\">" + categoryValue + "</h3>\n\
            </div>\n";
    
    var theThumbBar =
     "     <div id=\"thumbbar\">\n\
                <div class=\"centeredImage\">\n\
                    <div id=\"thumbdisplaydiv\"></div>\n\
                </div>\n\
            </div>\n\
            <div id=\"thumbnailDescription\"></div>\n";
            
    theHTML = theCategoryNameArea + theThumbBar + getCopyrightAndImageDisplayHTML();
     
    var theElement = document.getElementById("contentplaceholder");
    theElement.innerHTML = theHTML;
    
    var theElement = document.getElementById("thumbdisplaydiv");
    if ( null == theElement )
        return;
        
    for ( index in imageList )
    {
        if ( categoryValue != imageList[index].metadata.getCategoryValue() )
            continue;
            
        var thediv = document.createElement('div');
        thediv.setAttribute('id',imageList[index].filePath);
        thediv.innerHTML = getThumbnailHtml(imageList[index].filePath,imageList[index].metadata.title,0);
        
        theElement.appendChild(thediv);
    }
    
    showRandomImage(categoryValue);
}

function getThumbnailHtml( filePath, imageTitle, asSelected )
{
    if ( asSelected )
    {
        return "<img src=\"" + filePath + "\" id=\"displayedimage\" class=\"thumbnailImage\" onClick=\"showImage('" +
                              filePath + "','" + imageTitle +
                              "')\" style=\"border: 4px dotted #545565\" onMouseOver=\"showText('" + imageTitle +
                              "','thumbnailDescription');\" onMouseOut=\"hideText('thumbnailDescription');\"/>";
    }
    else
    {
        return "<img src=\"" + filePath + "\" id=\"displayedimage\" class=\"thumbnailImage\" onClick=\"showImage('" +
                              filePath + "','" + imageTitle +
                               "')\" onMouseOver=\"showText('" + imageTitle +
                               "','thumbnailDescription');\" onMouseOut=\"hideText('thumbnailDescription');\"/>";
    }
}

function loadImages()
{
    $.getJSON("images.json",
        function(json) {
            $.each(json.items,
                function(i,item)
                {
                    filePath = item.filename;
                    if ( 1 == item.bucket )
                        filePath = "images/" + item.filename;
                    
                    var md = new metadata( item.title, item.subject );
                    var ir = new imageRecord( filePath, md );
                    imageList[totalNumImages++] = ir;
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
    this.getCategoryValue = getCategoryValue;
}

function imageRecord( filePath, metadata )
{
    this.filePath = filePath;
    this.metadata = metadata;
}

function categoryRecord( categoryValue, numImages )
{
    this.categoryValue = categoryValue;
    this.numImages = numImages;
}

function currentlySelectedImageRecord( filePath, title )
{
    this.filePath = filePath;
    this.title = title;
}

function getCategoryValue()
{
    if ( "subject" == currentCategorization )
    {
        return this.subject;
    }
    else
    {
        return "undefined";
    }
}

function findCategories()
{
    categoryList.length = 0;
    for ( index in imageList )
    {
        var categoryValue = imageList[index].metadata.getCategoryValue();
        var found = 0;
        var foundIndex;
        for ( catIndex in categoryList )
        {
            if ( categoryList[catIndex].categoryValue == categoryValue )
            {
                found = 1;
                foundIndex = catIndex;
                break;
            }
        }
        
        if ( !found )
        {
            var catRecord = new categoryRecord( categoryValue, 1 );
            categoryList.push(catRecord);
        }
        else
        {
            categoryList[foundIndex].numImages++;
        }
    }
}

function hideImage()
{
    if ( currentlySelectedImage )
    {
        var theElement = document.getElementById(currentlySelectedImage.filePath);
        if ( !theElement )
            return;
            
        theElement.innerHTML = getThumbnailHtml(currentlySelectedImage.filePath, currentlySelectedImage.title,0);
        currentlySelectedImage = null;
    }
}

function showImage( filePath, imageTitle )
{
    hideImage();
    
    var titleHTML = "<h3 id=\"imagetitlearea\">" + imageTitle + "</h3>";
    var theElement = document.getElementById("imagetitlediv");
    if ( null == theElement )
        return;
        
    theElement.innerHTML = titleHTML;
    
    theElement = document.getElementById("imagedisplaydiv");
    if ( null == theElement )
        return;
        
    var theHTML = "<img src=\"" + filePath + "\" id=\"displayedimage\"/>";
    theElement.innerHTML = theHTML;
    
 
    theElement = document.getElementById(filePath);
    theElement.innerHTML = getThumbnailHtml(filePath,imageTitle,1);
    
    currentlySelectedImage = new currentlySelectedImageRecord( filePath, imageTitle );
}

function showRandomWelcomeImage()
{
    var index = Math.floor( Math.random() * totalNumImages );
    
    var theHTML = "<img src=\"" + imageList[index].filePath + "\" id=\"displayedimage\"/>";
    var theElement = document.getElementById("welcomeimagedisplaydiv");
    if ( null == theElement )
        return;
        
    theElement.innerHTML = theHTML;
}

function showRandomImage( categoryValue )
{
    var numImages = 0;
    for ( catRecordIndex in categoryList )
    {
        if ( categoryValue == categoryList[catRecordIndex].categoryValue )
        {
            numImages = categoryList[catRecordIndex].numImages;
        }
    }
    
    var index = Math.floor( Math.random() * numImages );
    var foundIndex = 0;
    for ( imageIndex in imageList )
    {
        if ( imageList[imageIndex].metadata.getCategoryValue() == categoryValue )
        {
            if ( foundIndex == index )
            {
                showImage( imageList[imageIndex].filePath, imageList[imageIndex].metadata.title );
                break;
            }
            else
            {
                foundIndex++;
            }
        }
    }

}


function showText( theText, theElementId )
{
    var theTextArea = document.getElementById(theElementId);
    theTextArea.innerHTML = theText;
}

function hideText( theElementId )
{
    showText("", theElementId);
}