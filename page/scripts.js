// Author: Tom Willekes
// Use is permitted as long as you give me credit, man.

// Page load actions
var loadParameters = null;
var locationsFileName = "locations.json";

// Metadata file loading management
var metadataList = new Array();
var currentMetadataItem = 0;

// Master list of images
var totalNumImages = 0;
var imageList = new Array();

// Master list of articles
var articleList = new Array();
var totalNumArticles = 0;

// Category management
var currentCategorization = "subject";
var currentCategoryValue; // E.g. "New" or "Houses" or ...
var categoryList = new Array();
var currentlySelectedImage = null;

// Welcome page image timer
var timerId = null;
var welcomeImageChangeTimeout = 10000; // In milliseconds

// Appearance mode
var usingLightbox = false;

/*

Image categories:
- Subject
- Season
- Camera
- Lens
- Film
- Monochrome versus polychrome
- Format (35mm, 6x4.5, 6x6, 6x7, 6x9, 6x12, 4x5)
- Year captured (2003 through 2010)
- Direction from Calgary (N, S, E, W, NW, SE, SW, NE)

Image information:
- File name
- Title
- Favorite (yes/no)
- New (yes/no)
- Description/notes
- Rating (1-10)
- Date captured

*/

function lostFocus()
{
    stopTimerEvents();
}

function gainedFocus()
{
    if ( document.getElementById( "welcome" ) )
    {
        timerId = setTimeout( "showRandomWelcomeImage(true)", welcomeImageChangeTimeout );
    }
}

//window.onload = initializePage(); Doesn't work in Firefox

function initializePage()
{
    var isMobile = isMobilePlatform();
        
    loadParameters = getParams();
    
    var isLocal = 0;
    var idx = document.URL.indexOf('file:');
    if ( idx != -1 )
        isLocal = 1;
        
    loadImages(isLocal);
    
    $(window).resize( function() {
        adjustCurrentImageSize();
    } );
}

function getParams()
{
    var idx = document.URL.indexOf('?');
    if ( idx == -1 )
    {
        idx = document.URL.indexOf('#');
        if ( idx == -1 )
            return null;
    }
    
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
    
    for ( index in categoryList )
    {
        if ( categoryList[index].imageIndexes.length == 0 )
            continue;
            
        var extra = "images";
        if ( categoryList[index].imageIndexes.length == 1 )
            extra = "image";
            
        var adiv = document.createElement('div');
        adiv.innerHTML = "<a href=\"javascript:switchTo('" + index +
                         "');\" title=\"" + categoryList[index].imageIndexes.length + " " + extra + "\">" +
                         index + "</a>\n";
        
        $("#menuitems").append(adiv);
    }
    
    if ( totalNumArticles > 0 )
    {
        var textToShow = totalNumArticles;
        if ( totalNumArticles == 1 )
            textToShow += " article";
        else
            textToShow += " articles";
            
        adiv = document.createElement('div');
        adiv.innerHTML = "<a href=\"javascript:toWordView();\" title=\"" + textToShow + "\">Words</a>\n";
        
        $("#otheritems").append(adiv);
    }
        
    var imageToShow = null;
    var catValToShow = null;
    
    if ( loadParameters != null )
    {
        for ( index in loadParameters )
        {
            if ( index == "showImage" )
            {
                imageToShow = unescape(loadParameters[index]);
            }
            else if ( index == "showCatVal" )
            {
                catValToShow = unescape(loadParameters[index]);
            } // TODO: Add support for showCat
            else if ( index == "showArticles" )
            {
                toWordView();
                return;
            }
            else if ( index == "showArticle" )
            {
                if ( showArticle(unescape(loadParameters[index])) )
                    return;
            }
        }
    }
    
    if ( imageToShow != null )
    {
        if ( catValToShow == null )
            toSingleImageView(imageToShow);
        else
            toImageView(catValToShow, imageToShow);
            
        return;
    }
    else if ( catValToShow != null )
    {
        toImageView(catValToShow);
        return;
    }
    
    toWelcomeView();
}

function findImage(filePath)
{
    var imageTitle = null;
    var newFilePath = filePath;
    for ( index in imageList )
    {
        var idx = imageList[index].filePath.indexOf(filePath);
        if ( idx != -1 )
        {
            newFilePath = imageList[index].filePath;
            imageTitle = imageList[index].metadata.title;
            break;
        }
    }
    
    if ( imageTitle == null )
    {
        newFilePath = imageList[0].filePath;
        imageTitle = imageList[0].metadata.title;
    }

    return { imageTitle : imageTitle, filePath : newFilePath };
}

function toSingleImageView(filePath)
{
    stopTimerEvents();
    
    var imageData = findImage( filePath );
    var imageTitle = imageData.imageTitle;
    filePath = imageData.filePath;
    
    var theHTML =
     "      <div id=\"singleImage\">\n\
                <div class=\"centeredImage\">\n\
                    <div id=\"imagetitlediv\"></div>\n\
                    <div id=\"imagedisplaydiv\"></div>\n\
                    <h3 style=\"text-align: center;\">Image Copyright 2003-2010 Tom Willekes</h3>\n\
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
        
    var theImage = new Image();
    theImage.src = filePath;

    var theHTML = "<img src=\"" + filePath + "\" id=\"displayedimage\" class=\"shadowKnows\" origWidth=\""
        + theImage.width + "\" origHeight=\"" + theImage.height + "\"/>";
    $("#imagedisplaydiv").hide().html(theHTML).fadeIn( 1000 );
    adjustCurrentImageSize();
}

function switchTo( categoryValue )
{
    toImageView(categoryValue);
}

function toWelcomeView()
{
    stopTimerEvents();
    
    parent.location.hash = "";

    var theHTML =
     "\
            <!--\n\
             Front page mode\n\
              -->\n\
            <div id=\"titlearea\">\n\
                <h1 style=\"text-align: center; margin: 0; padding: 0;\">Tom Willekes</h1>\n\
                <h2 style=\"text-align: center; margin: 0; padding: 0;\">Landscape and Nature Photography</h2>\n\
            </div>\n\
            <div id=\"welcome\">\n\
                <div class=\"centeredImage\" >\n\
                    <div id=\"welcomeimagedisplaydiv\" style=\"position:relative;\"></div>\n\
                </div>\n\
            </div>";
     
    var theElement = document.getElementById("contentplaceholder");
    theElement.innerHTML = theHTML;
    
    showRandomWelcomeImage(true);
}

function getImageDisplayHTML()
{
    var theImageDisplayArea =
     "      <div id=\"imagedisplayarea\">\n\
                <div class=\"centeredImage\">\n\
                    <div id=\"imagetitlediv\"></div>\n\
                    <div id=\"imagedisplaydiv\"></div>\n\
                    <div id=\"prevnextbuttondiv\">\n\
                    </div>\n\
                    <h3 style=\"text-align: center;\">Image Copyright 2003-2010 Tom Willekes</h3>\n\
                </div>\n\
            </div>\n";  
            
    return theImageDisplayArea;
}

function toImageView(categoryValue, imageToShow)
{
    stopTimerEvents();
        
    if ( usingLightbox )
        toImageView_lightbox(categoryValue, imageToShow);
    else
        toImageView_original(categoryValue, imageToShow);
}

function toImageView_lightbox(categoryValue, imageToShow)
{
    var theThumbBar =
     "      <div id=\"thumbpage\">\n\
                <ul style=\"list-style: none;\" id=\"thumbdisplaydiv\"></ul>\n\
            </div>\n";
            
    theHTML = theThumbBar;
     
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
            
        var thediv = document.createElement('li');
        thediv.setAttribute('id',imageList[index].filePath);
        thediv.setAttribute('title',imageList[index].metadata.title);        
        thediv.innerHTML = 
            "<a href=\"" + imageList[index].filePath + "\" title=\"" + imageList[index].metadata.imageTitle +
            "\" class=\"lightbox\"><img src=\"" + imageList[index].filePath + "\" width=\"150\" class=\"shadowKnows\"/></a>"
        
        theElement.appendChild(thediv);
    }
    
    // Box em
    $('a.lightbox').lightBox({
        overlayOpacity: 0.6
    });

    parent.location.hash = "showCat=" + escape(currentCategorization) +
                           "&showCatVal=" + escape(currentCategoryValue);
}

function toImageView_original(categoryValue, imageToShow)
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
            </div>\n";
            
    theHTML = theCategoryNameArea + theThumbBar + getImageDisplayHTML();
     
    var theElement = document.getElementById("contentplaceholder");
    theElement.innerHTML = theHTML;
    
    var theElement = document.getElementById("thumbdisplaydiv");
    if ( null == theElement )
        return;
        
    currentCategoryValue = categoryValue;
    var foundImagePath = null;
    var foundImageTitle = null;
        
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
        thediv.setAttribute('title',imageList[index].metadata.title);
        thediv.innerHTML = "<img src=\"" + imageList[index].filePath +
                           "\" onclick=\"showImage('"  + imageList[index].filePath + "','" + escape(imageList[index].metadata.title) +
                           "');\" class=\"thumbnailImage\" />\n"
        
        theElement.appendChild(thediv);
        
        if ( imageToShow != null && imageList[index].filePath.indexOf( imageToShow ) != -1 )
        {
            foundImagePath = imageList[index].filePath;
            foundImageTitle = imageList[index].metadata.title;
        }
    }
    
    if ( foundImagePath == null || foundImageTitle == null )
        showRandomImage(categoryValue);
    else
        showImage(foundImagePath,foundImageTitle);
}

function showArticle( articleTitle )
{
    for ( index in articleList )
    {
        var idx = articleList[index].title.indexOf(articleTitle);
        if ( idx != -1 )
        {
            showArticleAt(index);
            return 1;
        }
    }

    return 0;
}

function toWordView()
{
    stopTimerEvents();

    var theHTML =
     "\
            <div id=\"titlearea\">\n\
                <h1 style=\"text-align: center; margin: 0; padding: 0;\">Words</h1>\n\
            </div>\n\
            <div id=\"articleList\">\n\
                <div id=\"articleHeader\">\n\
                </div>\n\
                <div id=\"articleListItems\">\n\
                </div>\n\
                <h3>Contact</h3>\n\
                <p>Email: PhotonWrangler (at) shaw.ca</p>\n\
                <p>\n\
                <a href=\"http://members.shaw.ca/twillekes\">Home</a>\n\
                </p>\n\
            </div>\n\
    ";
     
    var theElement = document.getElementById("contentplaceholder");
    theElement.innerHTML = theHTML;

    for ( index in articleList )
    {
        var adiv = document.createElement('div');
        adiv.innerHTML = "<a href=\"javascript:showArticleAt('" + index +
                         "');\" id=\"articleListItem\">" + articleList[index].title + "</a>";
        
        $("#articleListItems").append(adiv);
    }
    
    $.ajax({
        url: "words/articleHeader.htm",
        dataType: "text",
        success: function(data) {
            $("#articleHeader").html(data);
        },
        error: function(request, status, error) {
            //alert("failed with: "+status+" and "+error);
        }
        });
        
    parent.location.hash = "showArticles";
}

function showArticleAt( articleFilePath )
{
    var theHTML =
     "\
            <div id=\"titlearea\">\n\
                <h1 style=\"text-align: center; margin: 0; padding: 0;\">" + articleList[articleFilePath].title + "</h1>\n\
            </div>\n\
            <div id=\"article\" style=\"text-align: center;\">\n\
            </div>";
     
    var theElement = document.getElementById("contentplaceholder");
    theElement.innerHTML = theHTML;
    
    $.ajax({
        url: articleFilePath,
        dataType: "text",
        success: function(data) {
            $("#article").html(data);
            $("img.resolveme").each( function (index) {
                $(this).attr('src', findImage( $(this).attr('src') ).filePath );
            } ); // Add the fully resolved path for images
        },
        error: function(request, status, error) {
            //alert("failed with: "+status+" and "+error);
        }
        });
    
    parent.location.hash = "showArticle=" + escape(articleList[articleFilePath].title);
}

function loadImages(isLocal)
{
    $.getJSON(locationsFileName,
        function(json)
        {
            var theIndex = 0;
            $.each(json.items,
                function(i,item)
                {
                    if ( (isLocal && item.type == "local") || 
                         (!isLocal && item.type != "local") ||
                         (item.type == null) )
                        metadataList[theIndex++] = item.metadataPath;
                }
            );
       
            currentMetadataItem = 0;
            loadMetadata( 0 );
        }
     );
}

function loadMetadata(metadataItem)
{
    var metadataFilePath = metadataList[metadataItem];

    $.ajax({
        url: metadataFilePath + "/metadata.json",
        dataType: "json",
        success: function(json) {
            $.each(json.items,
                function(i,item)
                {
                    if ( json.type != "words" )
                    {
                        var md = new metadata( item.title, item.subject, item.isNew, item.isFavorite );
                        var ir = new imageRecord( metadataFilePath + "/" + item.filename, md );
                        imageList[totalNumImages++] = ir;
                    }
                    else
                    {
                        var art = new article( item.title );
                        articleList[metadataFilePath+"/"+item.filename] = art;
                        totalNumArticles++; // ".length" doesn't work for associative arrays

                    }
                }
            );
                
            currentMetadataItem++;
            if ( currentMetadataItem < metadataList.length )
            {
                loadMetadata(currentMetadataItem);
            }
            else
            {
                buildMenu();
                return;
            }
        },
        error: function(request, status, error) {
            //alert("failed with: "+status+" and "+error);
        }
    });
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

function article( title )
{
    this.title = title;
}

function currentlySelectedImageRecord( filePath )
{
    this.filePath = filePath;
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
        if ( theElement == null )
            return;
            
        theElement.childNodes[0].style.border = '0';
        currentlySelectedImage = null;
    }
}

function showImage( filePath, imageTitle )
{
    stopTimerEvents();

    hideImage();
    
    var titleHTML = "<h3 id=\"imagetitlearea\">" + unescape(imageTitle) + "</h3>";
    var theElement = document.getElementById("imagetitlediv");
    if ( null == theElement )
        return;
        
    theElement.innerHTML = titleHTML;
    
    theElement = document.getElementById("imagedisplaydiv");
    if ( null == theElement )
        return;

    var theImage = new Image();
    theImage.onload = function() { imageLoaded(theImage,filePath); }
    theImage.src = filePath;
}

function imageLoaded( theImage, filePath )
{
    var theHTML = "<img src=\"" + theImage.src + "\" id=\"displayedimage\" origHeight=\"" +
                  theImage.height + "\" origWidth=\"" + theImage.width + "\"/>";
                  
    $("#imagedisplaydiv").hide().html(theHTML).fadeIn(1000);
    adjustCurrentImageSize();
    
    theElement = document.getElementById(filePath);
    if ( theElement == null )
        return;
        
    theElement.childNodes[0].style.border = '4px solid #606060';
        
    currentlySelectedImage = new currentlySelectedImageRecord( filePath );
    
    addPrevNextButtons();
    
    parent.location.hash = "showCat=" + escape(currentCategorization) +
                           "&showCatVal=" + escape(currentCategoryValue) +
                           "&showImage=" + escape(filePath.substring(filePath.lastIndexOf('/')+1));
}

function adjustCurrentImageSize()
{
    var $div = $("#displayedimage");
    
    var winHeight = $(window).height() * 0.75;
    var imgHeight = $div.attr("origHeight");
    var heightDiff = imgHeight/winHeight;
    
    var winWidth = $(window).width() * 0.58;
    var imgWidth = $div.attr("origWidth");
    var widthDiff = imgWidth/winWidth;
    
    $div.height("");
    $div.width("");
    
    if ( heightDiff <= 1.0 && widthDiff <= 1.0 )
        return;
    
    if ( heightDiff > widthDiff )
        $div.height(winHeight+'px');
    else
        $div.width(winWidth+'px');
}

function addPrevNextButtons()
{
    var theElement = document.getElementById("prevnextbuttondiv");
    if ( null == theElement )
    {
        return;
    }
        
    theElement.innerHTML =
                       "<table style=\"margin-left: auto; margin-right: auto;\">\n\
                            <tr>\n\
                                <td><div id=\"prevbuttondiv\">Previous</div></td>\n\
                                <td><div id=\"nextbuttondiv\">Next</div></td>\n\
                            </tr>\n\
                        </table>\n";

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
                nextIndex = catIndex; // If I go catIndex+1 here, nextIndex becomes a string type. WTF?
                nextIndex++;
            }
            break;
        }
    }
    
    // For some reason, using an HTML anchor tag for the prev/next buttons results in the
    // showImage call failing when the title has an apostrophe (even though it's escaped). WTF?
    
    setupButton(prevIndex, "prevbuttondiv");
    setupButton(nextIndex, "nextbuttondiv");
}

function setupButton(imageIndex, theDivName)
{
    var divName = "#" + theDivName;
    $div = $(divName);

    if (imageIndex == -1) {
        var cssSettings = {
            'background-color': '#E6E6E6',
            'color': 'gray',
            'cursor': 'not-allowed'
        };
        $div.css(cssSettings);
        $div.unbind('mouseover').unbind('mouseout').unbind('click');
    }
    else
    {
        var nextFilePath = imageList[categoryList[currentCategoryValue].imageIndexes[imageIndex]].filePath;
        var nextImageTitle = imageList[categoryList[currentCategoryValue].imageIndexes[imageIndex]].metadata.title;
        $div.click(function() { showImage(nextFilePath, nextImageTitle); });
        $div.hover(function() {
            var cssSettings = {
                'background-color': 'gray',
                'color': 'white',
                'cursor': 'pointer'
            };
            $(divName).css(cssSettings);
        },
        function() {
            var cssSettings = {
                'background-color': '#E6E6E6',
                'color': 'black',
                'cursor': 'auto'
            };
            $(divName).css(cssSettings);
        });
    }
}

function showRandomWelcomeImage( shouldStopFirst )
{
    if ( shouldStopFirst )
        stopTimerEvents();
    
    var index = Math.floor( Math.random() * totalNumImages );
    
    var theImage = new Image();
    theImage.onload = function () {
        var theHTML = "<img src=\"" + this.src +
            "\" id=\"displayedimage\" class=\"shadowKnows\" style=\"height: 0; position: relative;\" origWidth=\""
            + this.width + "\" origHeight=\"" + this.height + "\"/>";
            
        $("#welcomeimagedisplaydiv").html(theHTML);
        
        var winHeight = $(window).height() * 0.75;
        var imgHeight = this.height;
        var heightDiff = imgHeight/winHeight;
        
        var winWidth = $(window).width() * 0.58;
        var imgWidth = this.width;
        var widthDiff = imgWidth/winWidth;
        
        var theHeight = this.height;
        if ( heightDiff > 1.0 || widthDiff > 1.0 )
        {        
            if ( heightDiff > widthDiff )
            {
                theHeight = winHeight;
            }
            else
            {
                theHeight = ( winWidth / imgWidth ) * imgHeight;
            }
        }
        
        var $imageDiv = $("#displayedimage");
        $imageDiv.offset( { top: theHeight/2+$("#welcome").offset().top+25 } ); // ... fudge
        $imageDiv.animate( { height: theHeight, top: "-="+(theHeight/2) }, { duration: 2000 , complete: function ()
        {
            timerId = setTimeout(
                        function ()
                        {
                            var $div = $("#displayedimage");
                            var theHeight = $div.height();
                            $div.animate( { height : 0, width: 0, top : "+=" + (theHeight/2) }, { duration: 2000, complete: function ()
                                {
                                    $("#displayedimage").hide();
                                    timerId = null;
                                    showRandomWelcomeImage(false);
                                } } );
                            
                        }, welcomeImageChangeTimeout );
        } } );
    }
    theImage.src = imageList[index].filePath;

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

function isMobilePlatform()
{
    var uagent = navigator.userAgent.toLowerCase();
    if ( uagent.search("iphone") > -1 || uagent.search("ipod") > -1 )
        return 1;

    return 0;
}

function stopTimerEvents()
{
    if ( timerId != null ) // Stop welcome image change timer
    {
        clearTimeout( timerId );
        timerId = null;
    }
    
    $("#displayedimage").stop(true,false); // Stop any outstanding animations
}
