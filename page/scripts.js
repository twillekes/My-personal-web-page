// Page load actions
var loadParameters = null;

// Metadata file loading management
var imageMetadataList = new Array();
var currentImageMetadataItem = 0;

// Master list of images
var totalNumImages = 0;
var imageList = new Array();

// Category management
var currentCategorization = "subject";
var currentCategoryValue; // E.g. "New" or "Houses" or ...
var categoryList = new Array();
var currentlySelectedImage = null;

// Welcome page image timer
var timerId = null;
var welcomeImageChangeTimeout = 15000; // In milliseconds

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

//window.onload = initializePage(); Doesn't work in Firefox

function initializePage()
{
    loadParameters = getParams();
    
    var isLocal = 0;
    var idx = document.URL.indexOf('file:');
    if ( idx != -1 )
        isLocal = 1;
        
    loadImages(isLocal);
}

function getParams()
{
    var idx = document.URL.indexOf('?');
    if ( idx == -1 )
        return null;
    
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
        if ( categoryList[index].imageIndexes.length == 0 )
            continue;
            
        var adiv = document.createElement('div');
        var extra = "images";
        if ( categoryList[index].imageIndexes.length == 1 )
            extra = "image";
            
        adiv.innerHTML = "<a href=\"javascript:switchTo('" + index +
                         "');\" onMouseOver=\"showText(escape('" +
                         categoryList[index].imageIndexes.length + " " + extra +
                         "'),'buttonDescription');\" onMouseOut=\"hideText('buttonDescription')\">" +
                         index + "</a>";
        
        theElement.appendChild(adiv);
    }

    if ( loadParameters != null )
    {
        for ( index in loadParameters )
        {
            if ( index == "showImage" )
            {
                toSingleImageView(loadParameters[index]);
                return;
            }
        }
    }
    
    toWelcomeView();
}

function toSingleImageView(filePath)
{
    var imageTitle = null;
    for ( index in imageList )
    {
        var idx = imageList[index].filePath.indexOf(filePath);
        if ( idx != -1 )
        {
            filePath = imageList[index].filePath;
            imageTitle = imageList[index].metadata.title;
            break;
        }
    }
    
    if ( imageTitle == null )
    {
        filePath = imageList[0].filePath;
        imageTitle = imageList[0].metadata.title;
    }
    
    var theHTML =
     "      <div id=\"singleImage\">\n\
                <div class=\"centeredImage\">\n\
                    <div id=\"imagetitlediv\"></div>\n\
                    <div id=\"imagedisplaydiv\"></div>\n\
                    <h3 style=\"text-align: center;;\">Image Copyright 2003-2010 Tom Willekes</h3>\n\
                </div>\n\
            </div>\n";  
     
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
            <!--\n\
             Front page mode\n\
              -->\n\
            <div id=\"titlearea\">\n\
                <h1 style=\"text-align: center; margin: 0; padding: 0;\">Photonwrangler</h1>\n\
                <h2 style=\"text-align: center; margin: 0; padding: 0;\">Landscape and Nature Photography</h2>\n\
            </div>\n\
            <div id=\"welcome\">\n\
                <div class=\"centeredImage\">\n\
                     <!--br/-->\n\
                    <div id=\"welcomeimagedisplaydiv\"></div>\n\
                </div>\n\
                <!--iframe src=\"welcomeText.html\" frameborder=\"0\" id=\"welcometextdiv\" allowTransparency=\"true\"></iframe-->\n\
                <div style=\"text-align: center\" id=\"welcometextdiv\">\n\
                     <p>More images: <a href=\"http://flickr.com/photos/photonwrangler\" target=\"_top\">Flickr</a>.</p>\n\
                    <p>Email: PhotonWrangler (at) shaw.ca</p>\n\
                </div>\n\
            </div>";
     
    var theElement = document.getElementById("contentplaceholder");
    theElement.innerHTML = theHTML;
    
    showRandomWelcomeImage();
}

function getImageDisplayHTML()
{
    var theImageDisplayArea =
     "      <div id=\"imagedisplayarea\">\n\
                <div class=\"centeredImage\">\n\
                    <div id=\"imagetitlediv\"></div>\n\
                    <div id=\"imagedisplaydiv\"></div>\n\
                    <div id=\"prevnextbuttondiv\">\n\
                        <table style=\"margin-left: auto; margin-right: auto;\">\n\
                            <tr>\n\
                                <td><div id=\"prevbuttondiv\">Previous</div></td>\n\
                                <td><div id=\"nextbuttondiv\">Next</div></td>\n\
                            </tr>\n\
                        </table>\n\
                    </div>\n\
                    <h3 style=\"text-align: center;\">Image Copyright 2003-2010 Tom Willekes</h3>\n\
                </div>\n\
            </div>\n";  
            
    return theImageDisplayArea;
}

function toImageView(categoryValue)
{
    if ( timerId != null )
    {
        clearTimeout( timerId );
        timerId = null;
    }
        
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
            
    theHTML = theCategoryNameArea + theThumbBar + getImageDisplayHTML();
     
    var theElement = document.getElementById("contentplaceholder");
    theElement.innerHTML = theHTML;
    
    var theElement = document.getElementById("thumbdisplaydiv");
    if ( null == theElement )
        return;
        
    currentCategoryValue = categoryValue;
        
    for ( index in imageList )
    {
        if (   !(
                ( categoryValue == imageList[index].metadata.getCategoryValue() ) ||
                ( categoryValue == "New" && imageList[index].metadata.isNew ) ||
                ( categoryValue == "Favorites" && imageList[index].metadata.isFavorite )
                )
            )
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
                              filePath + "','" + escape(imageTitle) +
                              "')\" style=\"border: 4px solid #606060\" onMouseOver=\"showText('" + escape(imageTitle) +
                              "','thumbnailDescription');\" onMouseOut=\"hideText('thumbnailDescription');\"/>\n";
    }
    else
    {
        return "<img src=\"" + filePath + "\" id=\"displayedimage\" class=\"thumbnailImage\" onClick=\"showImage('" +
                              filePath + "','" + escape(imageTitle) +
                               "')\" onMouseOver=\"showText('" + escape(imageTitle) +
                               "','thumbnailDescription');\" onMouseOut=\"hideText('thumbnailDescription');\"/>\n";
    }
}

function loadImages(isLocal)
{
    $.getJSON("images.json",
        function(json)
        {
            $.each(json.items,
                function(i,item)
                {
                    if ( isLocal && item.type == "local" )
                        imageMetadataList[i] = item.metadataPath;
                    else if ( !isLocal && ( item.type != "local" ) || ( item.type == null ) )
                        imageMetadataList[i] = item.metadataPath;
                }
            );
       
            currentImageMetadataItem = 0;
            loadImageMetadata( 0 );
        }
     );
}

function loadImageMetadata(metadataItem)
{
    var metadataFilePath = imageMetadataList[metadataItem];
    $.getJSON(metadataFilePath + "/metadata.json",
        function(json)
        {
            $.each(json.items,
                function(i,item)
                {
                    var md = new metadata( item.title, item.subject, item.isNew, item.isFavorite );
                    var ir = new imageRecord( metadataFilePath + "/" + item.filename, md );
                    imageList[totalNumImages++] = ir;
                }
            );
                
            currentImageMetadataItem++;
            if ( currentImageMetadataItem < imageMetadataList.length )
            {
                loadImageMetadata(currentImageMetadataItem);
            }
            else
            {
                buildMenu();
                return;
            }
        }
     );
}

function metadata( title, subject, isNew, isFavorite )
{
    this.title = title;
    this.subject = subject;
    this.isNew = isNew;
    this.isFavorite = isFavorite;
    this.getCategoryValue = getCategoryValue;
}

function imageRecord( filePath, metadata )
{
    this.filePath = filePath;
    this.metadata = metadata;
}

function categoryRecord()
{
    this.imageIndexes = new Array();
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
    
    var catRecord = new categoryRecord();
    categoryList["New"] = catRecord;
    catRecord = new categoryRecord();
    categoryList["Favorites"] = catRecord;
    
    for ( index in imageList )
    {
        var categoryValue = imageList[index].metadata.getCategoryValue();
        if ( "Discarded" == categoryValue ) // Allows an image to be present but not displayed
            continue;
            
        var found = 0;
        var foundIndex;
        for ( catIndex in categoryList )
        {
            if ( catIndex == categoryValue )
            {
                found = 1;
                foundIndex = catIndex;
                break;
            }
        }
        
        if ( !found )
        {
            catRecord = new categoryRecord();
            catRecord.imageIndexes.push(index);
            categoryList[categoryValue] = catRecord;
        }
        else
        {
            categoryList[foundIndex].imageIndexes.push(index);
        }
        
        if ( imageList[index].metadata.isNew )
            categoryList["New"].imageIndexes.push(index);
        
        if ( imageList[index].metadata.isFavorite )
            categoryList["Favorites"].imageIndexes.push(index);

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
    if ( timerId != null )
    {
        clearTimeout( timerId );
        timerId = null;
    }

    hideImage();
    
    var titleHTML = "<h3 id=\"imagetitlearea\">" + unescape(imageTitle) + "</h3>";
    var theElement = document.getElementById("imagetitlediv");
    if ( null == theElement )
        return;
        
    theElement.innerHTML = titleHTML;
    
    theElement = document.getElementById("imagedisplaydiv");
    if ( null == theElement )
        return;
        
    var theHTML = "<img src=\"" + filePath + "\" id=\"displayedimage\"/>";
    setOpacity( theElement, 0 );
    theElement.innerHTML = theHTML;
    fadeIn( "imagedisplaydiv", 10 );
    
    theElement = document.getElementById(filePath);
    theElement.innerHTML = getThumbnailHtml(filePath,unescape(imageTitle),1);
    
    currentlySelectedImage = new currentlySelectedImageRecord( filePath, unescape(imageTitle) );
    
    addPrevNextButtons();
}

function addPrevNextButtons()
{
    var prevIndex = -1;
    var nextIndex = -1;
    for ( catIndex in categoryList[currentCategoryValue].imageIndexes )
    {
        if ( imageList[categoryList[currentCategoryValue].imageIndexes[catIndex]].filePath == currentlySelectedImage.filePath )
        {
            if ( catIndex > 0 )
            {
                prevIndex = catIndex - 1;
            }
            
            if ( catIndex < (categoryList[currentCategoryValue].imageIndexes.length-1) )
            {
                nextIndex = catIndex; // If I add 1 here, nextIndex becomes a string type. WTF?
                nextIndex++;
            }
            break;
        }
    }
    
    var theElement = document.getElementById("prevbuttondiv");
    if ( null == theElement )
        return;

    // For some reason, using an HTML anchor tag results in the showImage call failing when the title has an apostrophe. WTF?
    
    if ( prevIndex == -1 )
    {
        theElement.removeAttribute( "onClick" );
        theElement.setAttribute("style", "cursor: auto; background-color: #E6E6E6; color: gray;" );
    }
    else
    {
        var prevFilePath = imageList[categoryList[currentCategoryValue].imageIndexes[prevIndex]].filePath;
        var prevImageTitle = imageList[categoryList[currentCategoryValue].imageIndexes[prevIndex]].metadata.title;
        theElement.setAttribute( "onClick", "javascript:showImage('" + prevFilePath + "','" + escape(prevImageTitle) + "');" );
        theElement.removeAttribute( "style" );
    }
    
    theElement = document.getElementById("nextbuttondiv");
    if ( null == theElement )
        return;

    if ( nextIndex == -1 )
    {
        theElement.removeAttribute( "onClick" );
        theElement.setAttribute("style", "cursor: auto; background-color: #E6E6E6; color: gray;" );
    }
    else
    {
        var nextFilePath = imageList[categoryList[currentCategoryValue].imageIndexes[nextIndex]].filePath;
        var nextImageTitle = imageList[categoryList[currentCategoryValue].imageIndexes[nextIndex]].metadata.title;
        theElement.setAttribute( "onClick", "javascript:showImage('" + nextFilePath + "','" + escape(nextImageTitle) + "');" );
        theElement.removeAttribute( "style" );
    }
}

function showRandomWelcomeImage()
{
    var index = Math.floor( Math.random() * totalNumImages );
    
    var theHTML = "<img src=\"" + imageList[index].filePath + "\" id=\"displayedimage\"/>";
    var theElement = document.getElementById("welcomeimagedisplaydiv");
    if ( null == theElement )
        return;
        
    setOpacity( theElement, 0 );
    theElement.innerHTML = theHTML;
    fadeIn( "welcomeimagedisplaydiv", 0 );
            
    timerId = setTimeout( "showRandomWelcomeImage()", welcomeImageChangeTimeout );
}

function showRandomImage( categoryValue )
{
    var numImages = 0;
    if ( categoryValue == "New" )
    {
        numImages = categoryList["New"].imageIndexes.length;
    }
    else if ( categoryValue == "Favorites" )
    {
        numImages = categoryList["Favorites"].imageIndexes.length;
    }
    else
    {
        for ( catRecordIndex in categoryList )
        {
            if ( categoryValue == catRecordIndex )
            {
                numImages = categoryList[catRecordIndex].imageIndexes.length;
            }
        }
    }
    
    var index = Math.floor( Math.random() * numImages );
    var foundIndex = 0;
    for ( imageIndex in imageList )
    {
        if ( 
                ( imageList[imageIndex].metadata.getCategoryValue() == categoryValue ) ||
                ( imageList[imageIndex].metadata.isNew && categoryValue == "New" ) ||
                ( imageList[imageIndex].metadata.isFavorite && categoryValue == "Favorites" )
            )
        {
            if ( foundIndex == index )
            {
                showImage( imageList[imageIndex].filePath, escape(imageList[imageIndex].metadata.title) );
                break;
            }
            else
            {
                foundIndex++;
            }
        }
    }
   
    // This would probably be disconcerting to users 
//    timerId = setTimeout( function () { showRandomImage( categoryValue ) }, welcomeImageChangeTimeout );
}


function showText( theText, theElementId )
{
    var theTextArea = document.getElementById(theElementId);
    theTextArea.innerHTML = unescape(theText);
}

function hideText( theElementId )
{
    showText(escape(""), theElementId);
}

function setOpacity( obj, opacity )
{
  opacity = (opacity == 100)?99.999:opacity;
  
  // IE/Win
  obj.style.filter = "alpha(opacity:"+opacity+")";
  
  // Safari<1.2, Konqueror
  obj.style.KHTMLOpacity = opacity/100;
  
  // Older Mozilla and Firefox
  obj.style.MozOpacity = opacity/100;
  
  // Safari 1.2, newer Firefox and Mozilla, CSS3
  obj.style.opacity = opacity/100;
}

function fadeIn( elementId, opacity )
{
    if (document.getElementById)
    {
        var theElement = document.getElementById(elementId);
        if (opacity < 100)
        {
            setOpacity(theElement, opacity);
            opacity += 5;
            window.setTimeout("fadeIn('"+elementId+"',"+opacity+")", 50);
        }
    }
}