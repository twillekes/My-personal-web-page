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
var categoryList; // This is filled with the categoryValues, e.g. "houses", "new", etc.
var currentCategoryIndex = 0; // E.g. "New" or "Houses" or ...
var currentlySelectedImage = null;

var categories = new Array( "subject", "season", "camera", "lens", "film", "chrome",
                            "format", "year", "month", "direction", "rating" );

// Welcome page image timer
var timerId = null;
var welcomeImageChangeTimeout = 10000; // In milliseconds

// Appearance mode
var currentView = null;
var usingLightbox = false;
var showingMetadata = false;
var $currentlySelectedButton = null;
var $pivotMenu = null;

// URL monitoring
var currentHash = null;

var supportPivot = true;
var supportLightbox = true;
var supportUrlHash = false;

var categorizationText = "View images by...";
var origViewText = "View as original";
var lbViewText = "View as lightbox";

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
- Filters
- Discarded (yes/no)

"Season" : "SEASON", "Camera" : "CAMERA", "filters" : "FILTERS", "Lens" : "Unknown", "Film" : "FILM", "Chrome" : "Polychrome", "Format" : "FORMAT", "Year" : "YEAR", "Date" : "DATE", "Direction" : "DIRECTION", "Rating" : "RATING", "Caption" : "None", "isDiscarded" : 0

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
        
    var isLocal = 0;
    var idx = document.URL.indexOf('file:');
    if ( idx != -1 )
        isLocal = 1;
        
    loadImages(isLocal);
    
    $(window).resize( function() {
        adjustCurrentImageSize();
    } );
    
    if ( supportUrlHash )
        $(window).bind( 'hashchange', function(e) { syncToUrl(); } );
}

function setCurrentHash(theHash)
{
    currentHash = theHash;
    parent.location.hash = currentHash;
}

function syncToUrl()
{
    if ( (parent.location.hash == "" && currentHash == "") ||
          parent.location.hash == "#"+currentHash )
        return;

    loadParameters = getParams();
    
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
            }
            else if ( index == "showCat" )
            {
                currentCategorization = unescape(loadParameters[index]);
                delete loadParameters[index];
                buildPivotMenu();
                findCategories();
                buildMenu();
            }
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
            else if ( index == "showMode" )
            {
                if ( loadParameters[index] == "Lightbox" )
                    usingLightbox = true;
                else
                    usingLightbox = false;
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

function getParams()
{
    var idx = document.URL.indexOf('?');
    if ( idx == -1 )
    {
        idx = document.URL.indexOf('#');
        if ( idx == -1 )
            return null;
            
        var remainder = document.URL.substring(idx+1);
        if ( remainder == "" )
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

function switchTo()
{
    toImageView(this.innerHTML);
    this.origClass = 'buttonSelectedColors';
}

function buildMenu()
{
    $("#menuitems").children().remove();
    $("#otheritems").children().remove();
    $("#viewitems").children().remove();
    
    for ( index in categoryList )
    {
        if ( categoryList[index].imageIndexes.length == 0 )
            continue;
            
        var extra = "images";
        if ( categoryList[index].imageIndexes.length == 1 )
            extra = "image";
            
        var adiv = document.createElement('div');
        adiv.setAttribute('class', 'buttondiv');
        adiv.setAttribute('id', encodeValue(categoryList[index].categoryValue));
        adiv.innerHTML = "<a class=\"tooltip buttonColors\" title=\"" + categoryList[index].imageIndexes.length + " " + extra +
                         "\">" +
                         categoryList[index].categoryValue + "</a>\n";
        adiv.firstChild.onclick = switchTo;
        
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
        adiv.setAttribute('class', 'buttondiv');
        adiv.setAttribute('id','words');
        adiv.innerHTML = "<a class=\"tooltip buttonColors\" title=\"" + textToShow + "\">Words</a>\n";
        adiv.firstChild.onclick = toWordView;
        
        $("#otheritems").append(adiv);
    }
    
    if ( supportLightbox )
    {
        var lightboxHelpText = "Change the way image categories are viewed";
        
        var modeText = lbViewText;
        if ( usingLightbox )
            modeText = origViewText;
            
        adiv = document.createElement('div');
        adiv.setAttribute('class', 'buttondiv');
        adiv.innerHTML = "<a href=\"javascript:toggleThumbView();\" class=\"tooltip buttonColors\" id=\"toggleThumbView\" title=\""
                         + lightboxHelpText + "\">" + modeText + "</a>\n";
        
        $("#viewitems").append(adiv);
    }
    
    if ( $pivotMenu != null )
    {
        adiv = document.createElement('div');
        adiv.innerHTML = "<a id=\"pivotMenuButton\" class=\"popupMenu buttonColors\">" + categorizationText + "</a>\n";
        
        $("#viewitems").append(adiv);
        
        setupPopupMenu('pivotMenuButton', $pivotMenu, function(theHTML){
            currentCategorization = theHTML;
            findCategories();
            buildMenu();
            toWelcomeView();
        } );
    }
        
    initializeTooltips(true);
}

function buildPivotMenu()
{
    if ( !supportPivot )
        return;
        
    $pivotMenu = $('<div id=\"pivotMenu\"></div>');
    for ( index in categories )
    {
        var theClass = 'buttonColors';
        if ( currentCategorization != null && currentCategorization == categories[index] )
            theClass = 'buttonSelectedColors';
            
        $pivotMenu.append( $('<a theIndex=\"' + index +
                             '\" class=\"popupMenuButton ' + theClass + '\">' + categories[index] + '</a>') );
    }
}

function findImage(filePath)
{
    var imageTitle = null;
    var newFilePath = filePath;
    var foundIndex = null;
    for ( index in imageList )
    {
        var idx = imageList[index].filePath.indexOf(filePath);
        if ( idx != -1 )
        {
            newFilePath = imageList[index].filePath;
            imageTitle = imageList[index].metadata.title;
            foundIndex = index;
            break;
        }
    }
    
    if ( imageTitle == null )
    {
        newFilePath = imageList[0].filePath;
        imageTitle = imageList[0].metadata.title;
    }

    return { imageTitle : imageTitle, filePath : newFilePath, index : foundIndex };
}

function toggleThumbView()
{        
    if ( usingLightbox )
    {
        $("#toggleThumbView").html(lbViewText);
        usingLightbox = false;
    }
    else
    {
        $("#toggleThumbView").html(origViewText);
        usingLightbox = true;
    }
    
    if ( currentCategoryIndex != null )
        toImageView(categoryList[currentCategoryIndex].categoryValue);
}

function toSingleImageView(filePath)
{
    stopTimerEvents();
    
    var theElement = document.getElementById("contentplaceholder");
    theElement.innerHTML = getImageDisplayHTML();

    showImage(findImage(filePath).index);
    currentView = "single";
    return;
}

function toWelcomeView()
{
    if ( currentView == "welcome" )
    {
        setCurrentHash("showCat="+currentCategorization);
        return;
    }
        
    updateSelectedButton("menubar");
        
    stopTimerEvents();
    currentCategoryIndex = null;

    var theHTML =
     '\
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
            </div>';
     
    var theElement = document.getElementById("contentplaceholder");
    theElement.innerHTML = theHTML;
    
    showRandomWelcomeImage(true);
    currentView = "welcome";
    
    setCurrentHash("showCat="+currentCategorization);
}

function getImageDisplayHTML()
{
    var theImageDisplayArea =
     '      <div id=\"imagedisplayarea\">\n\
                <div class=\"centeredImage\">\n\
                    <div id=\"imagetitlediv\"></div>\n\
                    <div id=\"imagedisplaydiv\"></div>\n\
                    <div id=\"prevnextbuttondiv\"></div>\n\
                    <div id=\"metadatadiv\"></div>\n\
                    <h3 style=\"text-align: center;\">Image Copyright 2003-2010 Tom Willekes</h3>\n\
                </div>\n\
            </div>\n';  
            
    return theImageDisplayArea;
}

function encodeValue(value)
{
    return value.split(' ').join('_BLANK_').split('.').join('_DOT_').split('/').join('_SLASH_');
}

function decodeValue(value)
{
    return value.split('_BLANK_').join(' ').split('_DOT_').join('.').split('_SLASH_').join('/');
}

function toImageView(categoryValue, imageToShow)
{
    stopTimerEvents();
        
    if ( usingLightbox )
        toImageView_lightbox(categoryValue, imageToShow);
    else
        toImageView_original(categoryValue, imageToShow);
        
    currentView = "image";
    updateSelectedButton(encodeValue(categoryValue));
}

function updateSelectedButton(divName)
{
    if ( $currentlySelectedButton != null )
        $currentlySelectedButton.removeClass('buttonSelectedColors').addClass('buttonColors');
    
    if ( divName != null )
    {
        $currentlySelectedButton = $("#"+divName+">a");
        $currentlySelectedButton.removeClass('buttonColors').addClass('buttonSelectedColors');
    }
}

function findCategoryIndex(categoryValue)
{
    for ( index in categoryList )
    {
        if ( categoryList[index].categoryValue == categoryValue )
            return index;
    }
    
    console.log("ERROR: Could not find category value "+categoryValue);
    //alert("ERROR: Could not find category value "+categoryValue);
    return null;
}

function toImageView_lightbox(categoryValue, imageToShow)
{
    var theThumbBar =
     '      <div id=\"titlearea\">\n\
                <h1  style=\"text-align: center; margin: 0 0 0 0;\">' + categoryValue + '</h1>\n\
            </div>\n\
            <div id=\"thumbpage\">\n\
                <ul style=\"list-style: none;\" id=\"thumbdisplaydiv\"></ul>\n\
            </div>\n';
            
    theHTML = theThumbBar;
     
    var theElement = document.getElementById("contentplaceholder");
    theElement.innerHTML = theHTML;
    theElement = document.getElementById("thumbdisplaydiv");
    if ( null == theElement )
        return;
        
    currentCategoryIndex = findCategoryIndex(categoryValue);
        
    for ( index in imageList )
    {
        if (   !(
                ( categoryValue == imageList[index].metadata.getCategoryValue() ) ||
                ( categoryValue == "New" && imageList[index].metadata.isNew ) ||
                ( categoryValue == "Favorites" && imageList[index].metadata.isFavorite )
                ) ||
                ( imageList[index].metadata.isNew && categoryValue != "New" )
            )
            continue;
            
        var thumbFilePath = imageList[index].filePath;
        thumbFilePath     = thumbFilePath.substring(0,thumbFilePath.lastIndexOf('.'))+'_thumb.'+
                            thumbFilePath.substring(thumbFilePath.lastIndexOf('.')+1);
        
        var thediv = document.createElement('li');
        thediv.innerHTML = 
            "<a href=\"" + imageList[index].filePath + "\" title=\"" + imageList[index].metadata.title +
            "\" class=\"lightbox\"><img src=\"" + thumbFilePath + "\" /></a>\n"
        
        theElement.appendChild(thediv);
    }
    
    //initializeTooltips(); Sometimes lightbox wasn't get the title when class="lightbox tooltip"
        
    // Box em
    $('a.lightbox').lightBox({
        overlayOpacity: 0.6
    });

    setCurrentHash( "showCat=" + escape(currentCategorization) +
                    "&showCatVal=" + escape(categoryList[currentCategoryIndex].categoryValue) +
                    "&showMode=Lightbox" );
}

function toImageView_original(categoryValue, imageToShow)
{
    var theCategoryNameArea =
    '       <div id=\"categorynamearea\">\n\
                <h3  style=\"text-align: center; margin: 0 0 0 0;\">' + categoryValue + '</h3>\n\
            </div>\n';
    
    var theThumbBar =
     '     <div id=\"thumbbar\">\n\
                <div class=\"centeredImage\">\n\
                    <div id=\"thumbdisplaydiv2\"></div>\n\
                </div>\n\
            </div>\n';
            
    theHTML = theCategoryNameArea + theThumbBar + getImageDisplayHTML();
     
    var theElement = document.getElementById("contentplaceholder");
    theElement.innerHTML = theHTML;
    
    theElement = document.getElementById("thumbdisplaydiv2");
    if ( null == theElement )
        return;
        
    currentCategoryIndex = findCategoryIndex(categoryValue);
    var foundIndex = null;
        
    for ( index in imageList )
    {
        if (   !(
                ( categoryValue == imageList[index].metadata.getCategoryValue() ) ||
                ( categoryValue == "New" && imageList[index].metadata.isNew ) ||
                ( categoryValue == "Favorites" && imageList[index].metadata.isFavorite )
                ) ||
                ( imageList[index].metadata.isNew && categoryValue != "New" )
            )
            continue;
            
        var thediv = document.createElement('div');
        thediv.setAttribute('id',imageList[index].filePath);
        thediv.setAttribute('title',imageList[index].metadata.title);
        thediv.setAttribute('class','tooltip');
        
        var thumbFilePath = imageList[index].filePath;
        thumbFilePath     = thumbFilePath.substring(0,thumbFilePath.lastIndexOf('.'))+'_thumb.'+
                            thumbFilePath.substring(thumbFilePath.lastIndexOf('.')+1);
        
        thediv.innerHTML = '<img src=\"' + thumbFilePath +
                           '\" onclick=\"showImage('  + index + 
                           ');\" class=\"thumbnailImage\" style=\"outline: 0;\
                           -moz-box-shadow: 8px 8px 6px #808080;\
                           -webkit-box-shadow: 8px 8px 6px #808080;\
                           box-shadow: 8px 8px 6px #808080;\"/>\n';
        
        theElement.appendChild(thediv);
        
        if ( imageToShow != null && imageList[index].filePath.indexOf( imageToShow ) != -1 )
        {
            foundIndex = index;
        }
    }
    
    initializeTooltips(false,"div");
    
    if ( foundIndex == null )
        showRandomImage(categoryValue);
    else
        showImage(foundIndex);
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
    currentCategoryIndex = null;
    
    stopTimerEvents();

    var theHTML =
     '\
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
            </div>\n';
     
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
            //alert("ERROR: Fetch of articleHeader.htm failed with status "+status+" and error "+error);
            console.log("ERROR: Fetch of articleHeader.htm failed with status "+status+" and error "+error);
        }
        });
        
    setCurrentHash("showArticles");
    currentView = "words";
    this.origClass = 'buttonSelectedColors';
    updateSelectedButton("words");
}

function showArticleAt( articleFilePath )
{
    var theHTML =
     "\
            <div id=\"titlearea\">\n\
                <h1 style=\"text-align: center; margin: 0; padding: 0;\">" + articleList[articleFilePath].title + "</h1>\n\
            </div>\n\
            <div id=\"article\" style=\"text-align: center;\">\n\
                <div id=\"articleWrapper\"></div>\n\
            </div>";
     
    var theElement = document.getElementById("contentplaceholder");
    theElement.innerHTML = theHTML;
    
    $.ajax({
        url: articleFilePath,
        dataType: "text",
        success: function(data) {
            $("#articleWrapper").html(data);
            $("img.resolveme").each( function (index) {
                $(this).attr('src', findImage( $(this).attr('src') ).filePath );
            } ); // Add the fully resolved path for images
        },
        error: function(request, status, error) {
            //alert("ERROR: Fetch of "+articleFilePath+" failed with status "+status+" and error "+error);
            console.log("ERROR: Fetch of "+articleFilePath+" failed with status "+status+" and error "+error);
        }
        });
    
    setCurrentHash("showArticle=" + escape(articleList[articleFilePath].title));
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
                        var md = new metadata( item.title, item.subject, item.isNew, item.isFavorite, item.isDiscarded,
                                               item.season, item.camera, item.lens, item.filters, item.film,
                                               item.chrome, item.format, item.year, item.month, item.date,
                                               item.direction, item.rating, item.caption );
                        var ir = new imageRecord( metadataFilePath + "/" + item.filename, md );
                        imageList[totalNumImages++] = ir;
                    }
                    else
                    {
                        if ( item.isNotReady == null || !item.isNotReady )
                        {
                            var art = new article( item.title );
                            articleList[metadataFilePath+"/"+item.filename] = art;
                            totalNumArticles++; // ".length" doesn't work for associative arrays
                        }

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
                // This is where initialization is completed...
                findCategories();
                buildPivotMenu();
                buildMenu();
                syncToUrl();
                return;
            }
        },
        error: function(request, status, error) {
            //alert("ERROR: Fetch of "+metadataFilePath+"/metadata.json failed with status "+status+" and error "+error);
            console.log("ERROR: Fetch of "+metadataFilePath+"/metadata.json failed with status "+status+" and error "+error);
        }
    });
}

function metadata( title, subject, isNew, isFavorite, isDiscarded, season, camera, lens, filters,
                   film, chrome, format, year, month, date, direction, rating, caption )
{
    this.title = title;
    this.subject = subject;
    this.isNew = isNew;
    this.isFavorite = isFavorite;
    this.isDiscarded = isDiscarded
    this.season = season;
    this.camera = camera;
    this.lens = lens;
    this.filters = filters;
    this.film = film;
    this.chrome = chrome;
    this.format = format;
    this.year = year;
    this.month = month;
    this.date = date;
    this.direction = direction;
    this.rating = rating;
    this.caption = caption;
    
    this.getCategoryValue = getCategoryValue;
}

function imageRecord( filePath, metadata )
{
    this.filePath = filePath;
    this.metadata = metadata;
}

function categoryRecord(categoryValue)
{
    this.imageIndexes = new Array();
    this.categoryValue = categoryValue;
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
    else if ( "season" == currentCategorization )
    {
        return this.season;
    }
    else if ( "camera" == currentCategorization )
    {
        return this.camera;
    }
    else if ( "lens" == currentCategorization )
    {
        return this.lens;
    }
    else if ( "film" == currentCategorization )
    {
        return this.film;
    }
    else if ( "chrome" == currentCategorization )
    {
        return this.chrome;
    }
    else if ( "format" == currentCategorization )
    {
        return this.format;
    }
    else if ( "year" == currentCategorization )
    {
        return this.year;
    }
    else if ( "month" == currentCategorization )
    {
        return this.month;
    }
    else if ( "direction" == currentCategorization )
    {
        return this.direction;
    }
    else if ( "rating" == currentCategorization )
    {
        return this.rating;
    }
    else
    {
        return "undefined";
    }
}

function findCategories()
{
    categoryList = new Array();
    
    var newCatRecord = new categoryRecord("New");
    var favCatRecord = new categoryRecord("Favorites");
    
    for ( index in imageList )
    {
        if ( imageList[index].metadata.isNew == 1 )
        {
            newCatRecord.imageIndexes.push(index);
            continue;
        }
        
        if ( imageList[index].metadata.isDiscarded ) 
            continue;
            
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
            catRecord = new categoryRecord(categoryValue);
            catRecord.imageIndexes.push(index);
            categoryList.push(catRecord);
        }
        else
        {
            categoryList[foundIndex].imageIndexes.push(index);
        }
        
        if ( imageList[index].metadata.isFavorite )
            favCatRecord.imageIndexes.push(index);
    }
    
    categoryList.sort( function(a,b)
    {
        return ( b.categoryValue > a.categoryValue );
    });
    
    categoryList.push(favCatRecord);
    categoryList.push(newCatRecord);
    categoryList.reverse();
    
//    for ( index in categoryList )
//    {
//        console.log("Category "+categoryList[index].categoryValue+" has "+categoryList[index].imageIndexes.length+" elements");
//    }
}

function hideImage()
{
    if ( currentlySelectedImage )
    {
        var theElement = document.getElementById(currentlySelectedImage.filePath);
        if ( theElement == null )
            return;
        
        if ( isIE7OrLower() )
            theElement.childNodes[0].style.border = '0';
        else
            theElement.childNodes[0].setAttribute('style',
                'outline: 0;\
                -moz-box-shadow: 8px 8px 6px #808080;\
                -webkit-box-shadow: 8px 8px 6px #808080;\
                box-shadow: 8px 8px 6px #808080;');

        currentlySelectedImage = null;
    }
}

function showImage( index )
{
    stopTimerEvents();

    hideImage();
    
    var titleHTML = "<h3 id=\"imagetitlearea\">" + unescape(imageList[index].metadata.title) + "</h3>";
    var theElement = document.getElementById("imagetitlediv");
    if ( null == theElement )
    {
        //alert("ERROR: No imagetitlediv in showImage");
        console.log("ERROR: No imagetitlediv in showImage");
        return;
    }
        
    theElement.innerHTML = titleHTML;
    
    theElement = document.getElementById("imagedisplaydiv");
    if ( null == theElement )
    {
        //alert("ERROR: No imagedisplaydiv in showImage");
        console.log("ERROR: No imagedisplaydiv in showImage");
        return;
    }

    var theImage = new Image();
    theImage.onload = function() { imageLoaded(theImage,index); }
    theImage.src = imageList[index].filePath;
}

function imageLoaded( theImage, index )
{
    var filePath = imageList[index].filePath;
    var theHTML = "<img src=\"" + filePath + "\" id=\"displayedimage\" origHeight=\"" +
                  theImage.height + "\" origWidth=\"" + theImage.width + "\" class=\"shadowKnows\"/>";
                  
    $("#imagedisplaydiv").hide().html(theHTML).fadeIn(1000);
    adjustCurrentImageSize();
    
    theElement = document.getElementById(filePath);
    if ( theElement != null )
    {
        if ( isIE7OrLower() )
            theElement.childNodes[0].style.border = '7px solid #606060';
        else
            theElement.childNodes[0].setAttribute('style',
                'outline: 7px solid #606060;\
                -moz-box-shadow: 0px 0px 0px #808080;\
                -webkit-box-shadow: 0px 0px 0px #808080;\
                box-shadow: 0px 0px 0px #808080;');
            
        currentlySelectedImage = new currentlySelectedImageRecord( filePath );
    }
    
    addPrevNextButtons();
    
    $('#metadatadiv').children().remove();
    $('#metadatadiv').hide().append(getMetadataDiv(index));
    if ( showingMetadata )
        $('#metadatadiv').slideDown(1000);
    
    if ( currentCategoryIndex != null )
        theHash = "showCat=" + escape(currentCategorization) +
                  "&showCatVal=" + escape(categoryList[currentCategoryIndex].categoryValue) +
                  "&showImage=" + escape(filePath.substring(filePath.lastIndexOf('/')+1));
    else
        theHash = "showImage=" + escape(filePath.substring(filePath.lastIndexOf('/')+1));
        
    setCurrentHash(theHash);
}

function getMetadataDiv(index)
{
    var md = imageList[index].metadata;
    
    var theTable = $('<table id=\"metadatatable\"></table>');
    
    var theFilters = "";
    if ( md.filters != null )
        theFilters = md.filters;
        
    var theNotes = "";
    if ( md.caption != null && md.caption != "None" )
        theNotes = md.caption;
        
    var theLens = "";
    if ( md.lens != null && md.lens != "Unknown" )
        theLens = md.lens;
    
    // Row 1
    var theRow = $('<tr></tr>');
    theRow.append( $('<td style=\"width:10%\"><b><i>Taken:</b></i></td>') );
    theRow.append( $('<td>'+md.date+'</td>') );
    theRow.append( $('<td style=\"width:10%\"><b><i>Season:</b></i></td>') );
    theRow.append( $('<td>'+md.season+'</td>') );
    theRow.append( $('<td style=\"width:10%\"><b><i>Direction:</b></i></td>') );
    theRow.append( $('<td>'+md.direction+'</td>') );
    theTable.append(theRow);
    
    // Row 2
    theRow = $('<tr></tr>');
    theRow.append( $('<td style=\"width:10%\"><b><i>Camera:</b></i></td>') );
    theRow.append( $('<td>'+md.camera+'</td>') );
    theRow.append( $('<td style=\"width:10%\"><b><i>Lens:</b></i></td>') );
    theRow.append( $('<td>'+theLens+'</td>') );
    theRow.append( $('<td style=\"width:10%\"><b><i>Filters:</b></i></td>') );
    theRow.append( $('<td>'+theFilters+'</td>') );
    theTable.append(theRow);
    
    // Row 3
    theRow = $('<tr></tr>');
    theRow.append( $('<td style=\"width:10%\"><b><i>Film:</b></i></td>') );
    theRow.append( $('<td>'+md.film+'</td>') );
    theRow.append( $('<td style=\"width:10%\"><b><i>Format:</b></i></td>') );
    theRow.append( $('<td>'+md.format+'</td>') );
    theRow.append( $('<td style=\"width:10%\"><b><i>Score (/10):</b></i></td>') );
    theRow.append( $('<td>'+md.rating+'</td>') );
    theTable.append(theRow);
    
    // Row 4
    theRow = $('<tr></tr>');
    theRow.append( $('<td style=\"width:33%\"><b><i>Notes:</b></i></td>') );
    theRow.append( $('<td colspan="5">'+theNotes+'</td>') );
    theTable.append(theRow);
    
    return theTable;
}

function toggleMetadata()
{
    if ( !showingMetadata )
    {
        $('#metadatadiv').slideDown(1000);
        $('#infobuttondiv').html('Hide Info');
        showingMetadata = true;
    }
    else
    {
        $('#metadatadiv').slideUp(1000);
        $('#infobuttondiv').html('Show Info');
        showingMetadata = false;
    }
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
        //alert("ERROR: No prevnextbuttondiv in addPrevNextButtons");
        console.log("ERROR: No prevnextbuttondiv in addPrevNextButtons");
        return;
    }
        
    theElement.innerHTML =
                       "<table style=\"margin-left: auto; margin-right: auto;\">\n\
                            <tr>\n\
                                <td><div id=\"prevbuttondiv\" class=\"buttonColors\">Previous</div></td>\n\
                                <td><div id=\"infobuttondiv\" class=\"buttonColors\">Show Info</div></td>\n\
                                <td><div id=\"nextbuttondiv\" class=\"buttonColors\">Next</div></td>\n\
                            </tr>\n\
                        </table>\n";

    var prevIndex = -1;
    var nextIndex = -1;
    if ( currentCategoryIndex != null )
    {
        for ( catIndex in categoryList[currentCategoryIndex].imageIndexes )
        {
            if ( imageList[categoryList[currentCategoryIndex].imageIndexes[catIndex]].filePath == currentlySelectedImage.filePath )
            {
                if ( catIndex > 0 )
                {
                    prevIndex = catIndex - 1;
                }
                
                if ( catIndex < (categoryList[currentCategoryIndex].imageIndexes.length-1) )
                {
                    nextIndex = catIndex; // If I go catIndex+1 here, nextIndex becomes a string type. WTF?
                    nextIndex++;
                }
                break;
            }
        }
    }
    
    // For some reason, using an HTML anchor tag for the prev/next buttons results in the
    // showImage call failing when the title has an apostrophe (even though it's escaped). WTF?
    
    setupButton("prevbuttondiv", prevIndex);
    setupButton("infobuttondiv");
    setupButton("nextbuttondiv", nextIndex);
}

function setupButton(theDivName, imageIndex)
{
    var divName = "#" + theDivName;
    $div = $(divName);

    if (imageIndex == -1)
    {
        $div.remove();
        return;
    }
    
    if ( imageIndex != null )
    {
        $div.click(function() { showImage(categoryList[currentCategoryIndex].imageIndexes[imageIndex]); });
    }
    else
    {
        if ( !showingMetadata )
            $div.html("Show Info");
        else
            $div.html("Hide Info");
            
        $div.click(function() { toggleMetadata(); });
    }
        
    $div.hover(function() {
        $(divName).removeClass('buttonColors').addClass('buttonHoveredColors').css('cursor','pointer');
    },
    function() {
        $(divName).removeClass('buttonHoveredColors').addClass('buttonColors').css('cursor','auto');
    });
}

function showRandomWelcomeImage( shouldStopFirst )
{
    if ( shouldStopFirst )
        stopTimerEvents();
    
    var index = Math.floor( Math.random() * totalNumImages );
    
    var theImage = new Image();
    theImage.onload = function () {
        var theHTML = "<img src=\"" + this.src +
            "\" id=\"displayedwelcomeimage\" class=\"shadowKnows\" style=\"height: 0; position: relative;\" origWidth=\""
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
        
        var $imageDiv = $("#displayedwelcomeimage");
        $imageDiv.offset( { top: theHeight/2+$("#welcome").offset().top+25 } ); // ... fudge
        $imageDiv.animate( { height: theHeight, top: "-="+(theHeight/2) }, { duration: 2000 , complete: function ()
        {
            timerId = setTimeout(
                        function ()
                        {
                            var $div = $("#displayedwelcomeimage");
                            var theHeight = $div.height();
                            $div.animate( { height : 0, width: 0, top : "+=" + (theHeight/2) }, { duration: 2000, complete: function ()
                                {
                                    $("#displayedwelcomeimage").hide();
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
        numImages = categoryList[findCategoryIndex("New")].imageIndexes.length;
    }
    else if ( categoryValue == "Favorites" )
    {
        numImages = categoryList[findCategoryIndex("Favorites")].imageIndexes.length;
    }
    else
    {
        for ( catRecordIndex in categoryList )
        {
            if ( categoryValue == categoryList[catRecordIndex].categoryValue )
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
                showImage(imageIndex);
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
    $("#tooltip").remove();
}

this.initializeTooltips = function(changeBackground, tagName)
{
    if (isIE6()) // Lots of weirdness with this function in IE6
        return;
        
    if (tagName == null)
        tagName = "a";

    $(tagName + ".tooltip").hover(function(e) {
        $("#tooltip").remove();
        
        if ( this.title == "" )
        {
            //alert("ERROR: No title for "+this.innerHTML);
            console.log("ERROR: No title for "+this.innerHTML);
            return;
        }
            
        this.t = this.title;
        this.title = "";
        $("body").append("<p id='tooltip'>" + unescape(this.t) + "</p>");

        var loc = getTipLocation(e);

        $("#tooltip")
            .css("top", loc.top + "px")
            .css("left", loc.left + "px")
            .fadeIn("fast");
        
        if ( changeBackground )
        {
            this.origClass = this.className;
            this.className = 'tooltip buttonHoveredColors';
        }
    },
	function() {
        if ( this.t != "" )
            this.title = this.t;
        
	    this.t = "";
	    $("#tooltip").remove();
        
        if ( changeBackground )
            this.className = this.origClass;
	});
    $(tagName + ".tooltip").mousemove(function(e) {
        var loc = getTipLocation(e);

        $("#tooltip")
            .css("top", loc.top + "px")
            .css("left", loc.left + "px");
    });
};

function getTipLocation(e)
{
    yOffset = 0;
    xOffset = 10;
    
    var leftValue = e.pageX + xOffset;
    var tipWidth = $("#tooltip").width();
    var rightExtent = leftValue + tipWidth + 15;
    if (rightExtent > $(window).width())
        leftValue -= (rightExtent - $(window).width());

    var topValue = e.pageY - yOffset;
    var tipHeight = $("#tooltip").height();
    var topExtent = topValue + tipHeight + 15;
    if (topExtent > $(window).height())
        topValue -= (topExtent - $(window).height());
        
    return { top: topValue, left: leftValue };
}

function setupPopupMenu( buttonDivName, $theMenuDiv, clickHandler )
{
    $('#'+ buttonDivName + '.popupMenu').hover(function(e) {
        if ( this.$popupMenu == null )
        {
            this.$popupMenu = $("<div id='popupMenu' style=\"width: 100px;\"></div>");
            this.$popupMenu.append($theMenuDiv);
        
            $("body").append(this.$popupMenu);
        }
        this.$popupMenu.show();
        
        this.loc = getPopupLocation(buttonDivName, $theMenuDiv);
        this.$popupMenu.offset({left:this.loc.left,top:this.loc.top}).fadeIn("slow");
        
        initializePopupMenuItems($theMenuDiv, this.loc, this.$popupMenu);
        
        this.origClass = this.className;
        this.className = 'buttonHoveredColors';
    },
	function(e) {
        if ( !isInRect( { left: e.pageX, top: e.pageY }, this.loc ) )
            this.$popupMenu.hide();

        this.className = this.origClass;
	});
    
    $theMenuDiv.children().click(function() {
        $("#popupMenu").remove();
        $theMenuDiv.children().removeClass('buttonSelectedColors').addClass('buttonColors');
        this.origClass = null;
        this.className = 'popupMenuButton buttonSelectedColors';
        if ( clickHandler != null )
            clickHandler(this.innerHTML);
    });
}

function initializePopupMenuItems($theMenuDiv, rect, $popupMenu)
{
    $popupMenu.hover(function(e){
    },
    function(e){
        $popupMenu.hide();
    });
    
    $theMenuDiv.children().hover(function(e) {
        if ( this.origClass != null )
            return;
            
        this.origClass = this.className;
        this.className = 'popupMenuButton buttonHoveredColors';
    },
    function(e) {
        if ( this.origClass == null )
            return;
            
        this.className = this.origClass;
        this.origClass = null;
    });
}

function getPopupLocation(buttonDivName, $theMenuDiv)
{
    var buttonX = $('#'+buttonDivName).offset().left+$('#'+buttonDivName).width();
    var rightExtent = buttonX + $theMenuDiv.width();
    if ( rightExtent > $(window).width() )
        buttonX -= (rightExtent - $(window).width());
        
    var buttonY = $('#'+buttonDivName).offset().top + 10;
    var topExtent = buttonY + $theMenuDiv.height();
    if ( topExtent > $(window).height() )
        buttonY -= (topExtent - $(window).height());
        
    return { top: buttonY, left: buttonX, height: $theMenuDiv.height(), width: $theMenuDiv.width() };
}

function isInRect(point,rect)
{
    if ( point.left < rect.left || point.left > (rect.left+rect.width) )
        return false;
        
    if ( point.top < rect.top || point.top > (rect.top+rect.height) )
        return false;
        
    return true;
}

function isIE6() // Has issues with hover for tooltips
{
    var exVer = getInternetExplorerVersion();
    if ( exVer != -1 )
    {
        if ( exVer <= 6.0 )
            return true;
    }
    
    return false;
}

function isIE7OrLower() // Doesn't support "outline" property
{
    var exVer = getInternetExplorerVersion();
    if ( exVer != -1 )
    {
        if ( exVer <= 7.0 )
            return true;
    }
    
    return false;
}

function getInternetExplorerVersion()
// Returns the version of Internet Explorer or a -1
// (indicating the use of another browser).
{
    var rv = -1; // Return value assumes failure.
    if (navigator.appName == 'Microsoft Internet Explorer')
    {
        var ua = navigator.userAgent;
        var re  = new RegExp("MSIE ([0-9]{1,}[\.0-9]{0,})");
        if (re.exec(ua) != null)
            rv = parseFloat( RegExp.$1 );
    }
    return rv;
}
