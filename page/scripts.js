// Author: Tom Willekes
// Use is permitted as long as you give me credit, man.

// Page load actions
var loadParameters = null;
var locationsFileName = "locations.json";

// Metadata file loading management
var metadataList = new Array();
var currentMetadataItem = 0;

// Master list of images
// An array of imageRecord instances
//		imageRecord has two properties: filePath and metadata
//		metadata has properties: title, subject, isNew, isFavorite, isDiscarded,
//		season, camera, lens, filters, film, chrome, format, year, month, date, 
//		direction, rating, caption, orientation
var totalNumImages = imageList.length;
//var imageList = new Array();

// Master list of articles
//var articleList = new Array();
var totalNumArticles = articleList.length;

// Category management
// "Categorization" means the way the images are sliced and diced (e.g. by subject, by season, by camera)
// "Category Value" is a particular instance of category (e.g. mountains, summer, Hasseblad)
var currentCategorization = "subject";
var categoryList; // This is filled with the categoryValues, e.g. "houses", "new", etc.
var currentCategoryIndex = 0; // E.g. "New" or "Houses" or ...
var currentlySelectedImage = null;
var categories = new Array( "subject", "orientation", "season", "camera", "lens", "film", "chrome",
                            "format", "year", "month", "direction", "rating" );

// Welcome page image timer
var timerId = null;
var welcomeImageChangeTimeout = 10000; // In milliseconds

// Appearance mode
var currentView = null;
var usingLightbox = false;
var showingMetadata = false;
var $currentlySelectedButton = null;
var $viewMenu = null;
var $pivotMenu = null;
var $categoryPopupMenu = null;

// URL monitoring
var currentHash = null;

// Used to develop features without making them live until done
var supportPivot = true;
var supportLightbox = true;
var supportUrlHash = true;

var viewText = "View as...";
var categorizationText = "View by...";

var metadataAnimationDuration = 250; // msec
var imageFadeInDuration = 250;

/*

Image Metadata Summary

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
- Orientation (vertical, horizontal, square)

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

Refactor:
- Menu object
  - Popup menu object
- View object
  - Welcome
  - Single image
  - Image plus thumbs
  - Lightbox
- Move HTML out of JS
- Move styles out of JS

*/

// ******************************************************************
// Window events
// ******************************************************************

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

// ******************************************************************
// Page initialization and URL management/sychronization
// ******************************************************************

function initializePage()
{
    var isMobile = isMobilePlatform();
        
    //var isLocal = 0;
    var idx = document.URL.indexOf('file:');
    if ( idx != -1 ) {
        //isLocal = 1;
    	$.each(imageList, function (i) {
    		this.filePath = this.localFilePath;
    	});
    }
    
    for (var i = 0; i < articleList.length; i++) {
    	if (articleList[i].doNotShow == "1") {
    		articleList.splice(i,1);
    	}
    }
    totalNumArticles = articleList.length;
        
    //loadImages(isLocal);
    completeInitialization();
}

// This function is called after all the page metadata is loaded
// It builds the UI based on that data and hooks up remaining event observers
function completeInitialization()
{
    findCategories();
    buildPivotMenu();
    buildMenu();
    //syncToUrl(unescape(parent.location.hash.substring(1))); // This will get called in history.init below
    
    $(window).resize( function() { adjustCurrentImageSize(); } );
    
    $.history.init( function(hash)
    {
        syncToUrl(hash);
    } );
}

function setCurrentHash(theHash)
{
    currentHash = theHash;
    jQuery.history.load(theHash);
}

function syncToUrl(theHash)
{
    if ( (theHash == "" && currentHash == "") || theHash == currentHash )
        return;

    loadParameters = getParams(theHash);
    
    var imageToShow = null;
    var catValToShow = null;
    usingLightbox = false;
    currentlySelectedImage = null;
    
    if ( loadParameters != null )
    {
        for ( index in loadParameters )
        {
            //console.log("Parameter name "+index+" is "+loadParameters[index]);
            //alert("Parameter name "+index+" is "+loadParameters[index]);
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
            else if ( index == "showAbout" )
            {
                showAboutView();
                return;
            }
            else if ( index == "showArticle" )
            {
                if ( showArticle(unescape(loadParameters[index])) )
                {
                    buildMenu();
                    return;
                }
            }
            else if ( index == "showMode" )
            {
                if ( loadParameters[index] == "Lightbox" )
                    usingLightbox = true;
                else
                    usingLightbox = false;
                    
                buildMenu();
            }
            else if ( index == "showStats" )
            {
                toStatsView();
                return;
            }
            else
            {
                //alert("ERROR: Unknown load parameter: "+index+" value "+loadParameters[index]);
                //console.log("ERROR: Unknown load parameter: "+index+" value "+loadParameters[index]);
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

function getParams(theParamString)
{
    var idx = 0;
    if ( theParamString == "" )
    {
        theParamString = unescape(document.URL);
        idx = theParamString.indexOf('?');
        if ( idx == -1 )
            return null;
            
        idx++;
    }
                
    var tempParams = new Object();
    var pairs = theParamString.substring(idx,theParamString.length).split('&');
    var numItems = 0;
    for (var i=0; i<pairs.length; i++)
    {
        nameVal = pairs[i].split('=');
        tempParams[nameVal[0]] = nameVal[1];
        numItems++;
    }
    
    if ( numItems == 0 )
        return null;
        
    return tempParams;
}

// ******************************************************************
// Page view modes and management
// ******************************************************************

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
            
        var className = '';
        if ( index == 0 )
            className = 'roundedTopBig';
        else if ( index == categoryList.length - 1 )
            className = 'roundedBottomBig';
            
        var adiv = document.createElement('div');
        adiv.setAttribute('class', 'buttondiv');
        adiv.setAttribute('id', encodeValue(categoryList[index].categoryValue));
        adiv.innerHTML = "<a class=\"tooltip buttonColors withDropShadow " + className + "\" title=\"" + categoryList[index].imageIndexes.length + " " + extra +
                         "\">" + categoryList[index].categoryValue + "</a>\n";
        adiv.firstChild.onclick = switchTo;
        
        $("#menuitems").append(adiv);
    }
    
    var roundness = 'roundedBottomBig';
    
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
        adiv.innerHTML = "<a class=\"tooltip buttonColors withDropShadow roundedTopBig\" title=\"" + textToShow + "\">Articles</a>\n";
        adiv.firstChild.onclick = toWordView;
        
        $("#otheritems").append(adiv);
    }
    else
    {
        roundness = 'roundedButton';
    }
    
    // "About" button
    adiv = document.createElement('div');
    adiv.setAttribute('class', 'buttondiv');
    adiv.setAttribute('id','about');
    adiv.innerHTML = "<a class=\"tooltip buttonColors withDropShadow " + roundness + "\" title=\"About the photographer and photographs\">About</a>\n";
    adiv.firstChild.onclick = showAboutView;
    $("#otheritems").append(adiv);
    
    if ( supportLightbox )
    {
        $viewMenu = $('<div id=\"viewMenu\" class=\"roundedButton\"></div>');
    
        var theClass = 'buttonColors';
        if ( !usingLightbox )
            theClass = 'buttonSelectedColors';
        $viewMenu.append( $('<a class=\"popupMenuButton roundedTop ' + theClass + '\">original</a>') );
    
        var theClass = 'buttonColors';
        if ( usingLightbox )
            theClass = 'buttonSelectedColors';
        $viewMenu.append( $('<a class=\"popupMenuButton roundedBottom ' + theClass + '\">lightbox</a>') );
    
        adiv = document.createElement('div');
        adiv.setAttribute('class', 'buttondiv');
        adiv.innerHTML = "<a id=\"viewMenuButton\" class=\"popupMenuSource buttonColors withDropShadow roundedTopBig\">" + viewText + "</a>\n";
        
        $("#viewitems").append(adiv);
        
        setupPopupMenu('viewMenuButton', $viewMenu, function(theHTML){
            setThumbView(theHTML);
        } );
    }
    
    if ( $pivotMenu != null )
    {
        adiv = document.createElement('div');
        adiv.innerHTML = "<a id=\"pivotMenuButton\" class=\"popupMenuSource buttonColors withDropShadow roundedBottomBig\">" + categorizationText + "</a>\n";
        
        $("#viewitems").append(adiv);
        
        setupPopupMenu('pivotMenuButton', $pivotMenu, function(theHTML){
            currentCategorization = theHTML;
            findCategories();
            buildMenu();
            toWelcomeView();
        } );
    }
        
    initializeButtonHover();
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
            
        if ( index == 0 )
            theClass += ' roundedTop';
            
        if ( index == categories.length - 1 )
            theClass += ' roundedBottom';
            
        $pivotMenu.append( $('<a theIndex=\"' + index +
                             '\" class=\"popupMenuButton ' + theClass + '\">' + categories[index] + '</a>') );
    }
}

function switchTo()
{
    toImageView(this.innerHTML);
    $(this).removeClass('buttonColors').addClass('buttonSelectedColors');
}


function setThumbView(theHTML)
{
    usingLightbox = false;
    if ( theHTML == "lightbox" )
        usingLightbox = true;
        
    buildMenu();
    
    if ( currentCategoryIndex != null && currentView == "image" )
        toImageView(categoryList[currentCategoryIndex].categoryValue);
}

function showAboutView()
{
    showArticleAt('words/about.htm','About');
    updateSelectedButton('about');
    currentView = 'about';
    setCurrentHash('showAbout');
}

function toSingleImageView(filePath)
{
    stopTimerEvents();
    
    var theElement = document.getElementById("contentplaceholder");
    theElement.innerHTML = getImageDisplayHTML('singleimagedisplayarea','prevnextbuttondiv_withoutThumbar');

    showImage(findImage(filePath).index);
    currentView = "single";
    updateSelectedButton(); // Don't show anything selected in single image view
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
            <div id=\"titlearea\" class="centeredImage">\n\
                <img src="TitleText.jpg"/>\n\
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

function encodeValue(value)
{
    if ( value == null )
        return 'Unknown';
        
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
    {
        $currentlySelectedButton.removeClass('buttonSelectedColors').addClass('buttonColors');
        $currentlySelectedButton = null;
    }
    
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
    
    //console.log("ERROR: Could not find category value "+categoryValue);
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
    for ( catIndex in categoryList[currentCategoryIndex].imageIndexes )
    {
        var index = categoryList[currentCategoryIndex].imageIndexes[catIndex];
        var thumbFilePath = imageList[index].filePath;
        thumbFilePath     = thumbFilePath.substring(0,thumbFilePath.lastIndexOf('.'))+'_thumb.'+
                            thumbFilePath.substring(thumbFilePath.lastIndexOf('.')+1);
        
        var thediv = document.createElement('li');
        thediv.innerHTML = 
            "<a href=\"" + imageList[index].filePath + "?uniq=" + (new Date).getTime() +
            "\" title=\"" + imageList[index].metadata.title +
            "\" class=\"lightbox\"><img src=\"" + thumbFilePath + "?uniq=" + (new Date).getTime() + "\" /></a>\n"
        
        theElement.appendChild(thediv);
    }
    
    // Box em
    $('a.lightbox').lightBox({
        overlayOpacity: 0.6
    });

    setCurrentHash( "showCat=" + escape(currentCategorization) +
                    "&showCatVal=" + escape(categoryList[currentCategoryIndex].categoryValue) +
                    "&showMode=Lightbox" );
}

function getImageDisplayHTML(topLevelDivName, prevNextButtonDivClass)
{
    if ( topLevelDivName == null )
        topLevelDivName = 'imagedisplayarea';
        
    if ( prevNextButtonDivClass == null )
        prevNextButtonDivClass = 'prevnextbuttondiv_withThumbar';
        
    var theImageDisplayArea =
     '      <div id=\"prevnextbuttondiv\" class=\"' + prevNextButtonDivClass + ' centeredImage\"></div>\n\
            <div id=\"' + topLevelDivName + '\">\n\
                <div class=\"centeredImage\">\n\
                    <div id=\"imagetitlediv\"></div>\n\
                    <div id=\"imagedisplaydiv\"></div>\n\
                    <div id=\"metadatadiv\"></div>\n\
                    <h3 style=\"text-align: center;\">Image Copyright 2003-2011 Tom Willekes</h3>\n\
                </div>\n\
            </div>\n';  
            
    return theImageDisplayArea;
}

function buildCategoryPopupMenu(categoryValue)
{
    $categoryPopupMenu = $('<div id=\"categoryPopupMenu\"></div>');
    for ( index in categoryList )
    {
        if ( categoryList[index].imageIndexes.length == 0 )
            continue;
            
        var className = 'buttonColors';
        if ( categoryValue == categoryList[index].categoryValue )
            className = 'buttonSelectedColors';
        
        if ( index == 0 )
            className += ' roundedTopBig';
        else if ( index == categoryList.length - 1 )
            className += ' roundedBottomBig';
            
        $categoryPopupMenu.append( $("<a class=\"popupMenuButton "
                                     + className + "\">" + categoryList[index].categoryValue + "</a>\n") );
    }
}

function toImageView_original(categoryValue, imageToShow)
{
    var theCategoryNameArea =
    '       <div id=\"categorynamearea\">\n\
                <a id=\"categoryPopupMenuButton\" class=\"popupMenuSource buttonColors withDropShadow roundedButton\">' + categoryValue + '</a>\n\
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

    buildCategoryPopupMenu(categoryValue);
    setupPopupMenu('categoryPopupMenuButton', $categoryPopupMenu, function(theHTML){
        toImageView(theHTML);
    }, true );

    
    theElement = document.getElementById("thumbdisplaydiv2");
    if ( null == theElement )
        return;
        
    currentCategoryIndex = findCategoryIndex(categoryValue);
    var foundIndex = null;
    for ( catIndex in categoryList[currentCategoryIndex].imageIndexes )
    {
        var index = categoryList[currentCategoryIndex].imageIndexes[catIndex];
            
        var thediv = document.createElement('div');
        
        var thumbFilePath = imageList[index].filePath;
        thumbFilePath     = thumbFilePath.substring(0,thumbFilePath.lastIndexOf('.'))+'_thumb.'+
                            thumbFilePath.substring(thumbFilePath.lastIndexOf('.')+1);
        
        thediv.innerHTML = '<a href=\"javascript:showImage(' + index +
                           ',true)\" class=\"tooltip\" title=\"'
                           + imageList[index].metadata.title + '\"><img src=\"' + thumbFilePath +
                           "?uniq=" + (new Date).getTime() +
                           '\" class=\"thumbnailImage withDropShadow noOutline\" id=\"'
                           + imageList[index].filePath + '\"/></a>\n';
        
        theElement.appendChild(thediv);
        
        if ( imageToShow != null && imageList[index].filePath.indexOf( imageToShow ) != -1 )
        {
            foundIndex = index;
        }
    }
    
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
            showArticleAtIndex(index);
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
        adiv.innerHTML = "<a href=\"javascript:showArticleAtIndex('" + index +
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
            //console.log("ERROR: Fetch of articleHeader.htm failed with status "+status+" and error "+error);
        }
        });
        
    setCurrentHash("showArticles");
    currentView = "words";
    updateSelectedButton("words");
}

function showArticleAtIndex(index) {
	if (index > articleList.length-1) {
		return;
	}
	showArticleAt(articleList[index].filename, articleList[index].title, true);
}

function showArticleAt( articleFilePath, theTitle, setHash )
{
	if (setHash == null) {
		setHash = false;
	}
        
    var theHTML =
     "\
            <div id=\"titlearea\">\n\
                <h1 style=\"text-align: center; margin: 0; padding: 0;\">" + theTitle + "</h1>\n\
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
            //console.log("ERROR: Fetch of "+articleFilePath+" failed with status "+status+" and error "+error);
        }
        });
    
    if ( setHash )
        setCurrentHash("showArticle=" + theTitle);
}

function toStatsView()
{
    var originalCategorization = currentCategorization;
    
    var $summaryElement = $('<div id=\"article\" style=\"text-align: left;\"/>');
    $summaryElement.append('<h2>There are a total of ' + totalNumImages + ' images</h2>');
    for ( __index in categories )
    {
        currentCategorization = categories[__index];
        findCategories(true);
        
        $summaryElement.append('<h3>Category: ' + categories[__index] + '</h3>');
        var $table = $('<table/>');
        $table.append('<tr><th>Value</th><th>Number of Images</th><th>Percent of Total</th></tr>');
        for ( categoryValueIndex in categoryList )
        {
            $table.append('<tr><td>' + categoryList[categoryValueIndex].categoryValue +
                                   '</td><td>' + categoryList[categoryValueIndex].imageIndexes.length +
                                   '</td><td>' + (categoryList[categoryValueIndex].imageIndexes.length*100/totalNumImages).toFixed(1) +
                                   '%</td></tr>');
        }
        $summaryElement.append($table);
    }
    
    $('#contentplaceholder').append($summaryElement);
    
    currentCategorization = originalCategorization;
    findCategories();
}

// ******************************************************************
// Tooltip and popup menu support
// ******************************************************************

this.initializeButtonHover = function()
{
    $("a.tooltip").hover(function(e)
    {        
        $(this).removeClass('buttonColors').addClass('buttonHoveredColors');
    },
	function()
    {
        $(this).removeClass('buttonHoveredColors').addClass('buttonColors');
	});
};

function setupPopupMenu( buttonDivName, $theMenuDiv, clickHandler, popToLeft )
{
    if ( popToLeft == null )
        popToLeft = false;
        
    $('#'+ buttonDivName + '.popupMenuSource').hover(function(e)
    {
        if ( this.$popupMenu == null )
        {
            this.$popupMenu = $("<div id='popupMenu_" + buttonDivName + "' class=\"popupMenu roundedButton\" style=\"width: 100px;\"></div>");
            this.$popupMenu.append($theMenuDiv);
        
            $("body").append(this.$popupMenu);
        }
        this.$popupMenu.show();
        
        this.loc = getPopupLocation(buttonDivName, $theMenuDiv, popToLeft);
        this.$popupMenu.offset({left:this.loc.left,top:this.loc.top});
        
        initializePopupMenuItems($theMenuDiv, this.loc, this.$popupMenu);
        
        $(this).removeClass('buttonColors').addClass('buttonHoveredColors');
    },
	function(e)
    {
        if ( !isInRect( { left: e.pageX, top: e.pageY }, this.loc ) )
            this.$popupMenu.hide();

        $(this).removeClass('buttonHoveredColors').addClass('buttonColors');
	});
    
    $theMenuDiv.children().click(function()
    {
        $("#popupMenu_"+buttonDivName).remove();
        $theMenuDiv.children().removeClass('buttonSelectedColors').addClass('buttonColors');
        $(this).addClass('buttonSelectedColors');
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
        $(this).removeClass('buttonColors').addClass('buttonHoveredColors');
    },
    function(e) {
        $(this).removeClass('buttonOveredColors').addClass('buttonColors');
    });
}

function getPopupLocation(buttonDivName, $theMenuDiv, popToLeft)
{
    var buttonX = $('#'+buttonDivName).offset().left;
    if ( !popToLeft )
        buttonX += $('#'+buttonDivName).outerWidth();
    else
        buttonX -= $theMenuDiv.outerWidth();
        
    var rightExtent = buttonX + $theMenuDiv.width();
    if ( rightExtent > $(window).width() )
        buttonX -= (rightExtent - $(window).width());
        
    var buttonY = $('#'+buttonDivName).offset().top;
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

// ******************************************************************
// Image presentation
// ******************************************************************

function hideImage()
{
    if ( currentlySelectedImage )
    {
        var theElement = document.getElementById(currentlySelectedImage.filePath);
        if ( theElement == null )
            return;
        
        if ( isIE7OrLower() )
        {
            //theElement.setAttribute( 'class', 'thumbnailImage noBorder' );
            theElement.style.border = '0';
        }
        else
            theElement.setAttribute('class', 'thumbnailImage noOutline withDropShadow' );

        currentlySelectedImage = null;
    }
}

function showImage( index, byUser )
{
    if ( byUser == null )
        byUser = false;
        
    stopTimerEvents();

    hideImage();
    
    var titleHTML = "<h3 id=\"imagetitlearea\">" + unescape(imageList[index].metadata.title) + "</h3>";
    var theElement = document.getElementById("imagetitlediv");
    if ( null == theElement )
    {
        //alert("ERROR: No imagetitlediv in showImage");
        //console.log("ERROR: No imagetitlediv in showImage");
        return;
    }
        
    theElement.innerHTML = titleHTML;
    
    theElement = document.getElementById("imagedisplaydiv");
    if ( null == theElement )
    {
        //alert("ERROR: No imagedisplaydiv in showImage");
        //console.log("ERROR: No imagedisplaydiv in showImage");
        return;
    }
    
    var theImage = new Image();
    theImage.onload = function() { imageLoaded(theImage,index,byUser); }
    theImage.src = imageList[index].filePath;
}

function imageLoaded( theImage, index, byUser )
{
    var filePath = imageList[index].filePath;
    var theHTML = "<img src=\"" + filePath + "?uniq=" + (new Date).getTime() +
    			  "\" id=\"displayedimage\" origHeight=\"" +
                  theImage.height + "\" origWidth=\"" + theImage.width + "\" class=\"withDropShadow\"/>";
                  
    $("#imagedisplaydiv").hide().html(theHTML).fadeIn(imageFadeInDuration);
    adjustCurrentImageSize();
    
    theElement = document.getElementById(filePath);
    if ( theElement != null )
    {
        if ( isIE7OrLower() )
        {
            //theElement.setAttribute('class', 'thumbnailImage withBorder' ); // Doesn't work on IE6
            theElement.style.border = '7px solid #606060';
        }
        else
            theElement.setAttribute('class', 'thumbnailImage withOutline noDropShadow' );
            
        currentlySelectedImage = new currentlySelectedImageRecord( filePath );
        
        // Scroll the div
        if ( !byUser )
            document.getElementById('thumbbar').scrollTop = theElement.offsetTop - 7;
    }
    
    addPrevNextButtons();

    $div = $('#metadatadiv');
    $div.children().remove();
    $div.hide().append(getMetadataDiv(index));
    if ( showingMetadata )
    {
        if ( !isSafari() )
        {
            $div.slideDown(metadataAnimationDuration); // This was jerky in Safari, hence the hand-waving with height
        }
        else
        {
            $div.show();
            var theHeight = $div.height();
            $div.css( { height: 0 } );
            $div.animate( { height: theHeight }, { duration: metadataAnimationDuration } );
        }
    }
    
    if ( currentCategoryIndex != null && currentlySelectedImage != null)
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
    var $div = $('#metadatadiv');
    if ( !showingMetadata )
    {
        if ( !isSafari() )
        {
            $div.slideDown(metadataAnimationDuration); // This is jerky in Safari
        }
        else
        {
            $div.show();
            var theHeight = $div.height();
            $div.css( { height: 0 } );
            $div.animate( { height: theHeight }, { duration: metadataAnimationDuration } );
        }

        $('#infobuttondiv').html('Hide Info');
        showingMetadata = true;
    }
    else
    {
        $div.slideUp(metadataAnimationDuration);
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
    $('#prevnextbuttondiv').html(
                       "<table style=\"margin-left: auto; margin-right: auto;\">\n\
                            <tr>\n\
                                <td><div id=\"prevbuttondiv\" class=\"buttonColors withDropShadow roundedButton\">Previous</div></td>\n\
                                <td><div id=\"infobuttondiv\" class=\"buttonColors withDropShadow roundedButton\">Show Info</div></td>\n\
                                <td><div id=\"nextbuttondiv\" class=\"buttonColors withDropShadow roundedButton\">Next</div></td>\n\
                            </tr>\n\
                        </table>\n");

    var prevIndex = -1;
    var nextIndex = -1;
    if ( currentCategoryIndex != null && currentlySelectedImage != null )
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
        var theHTML = "<a href=\"javascript:toSingleImageView('" + imageList[index].filePath + "')\"><img src=\"" +
        	this.src + "?uniq=" + (new Date).getTime() +
            "\" id=\"displayedwelcomeimage\" class=\"withDropShadow\" style=\"position: relative;\" theindex=\"" + index + "\"/></a>";
            
        $("#welcomeimagedisplaydiv").hide().html(theHTML).fadeIn(1000);
		timerId = setTimeout( function () {
					   $("#displayedwelcomeimage").show().fadeOut(1000, function () {
							timerId = null;
							showRandomWelcomeImage(false);
					   });
		}, welcomeImageChangeTimeout );
	};
	/* For funky in/out animation...
    theImage.onload = function () {
        var theHTML = "<a href=\"javascript:toSingleImageView('" + imageList[index].filePath + "')\"><img src=\"" + this.src +
            "\" id=\"displayedwelcomeimage\" class=\"withDropShadow\" style=\"height: 0; position: relative;\" origWidth=\""
            + this.width + "\" origHeight=\"" + this.height + "\" theindex=\"" + index + "\"/></a>";
            
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
	*/
	
    theImage.src = imageList[index].filePath;

}

function showRandomImage( categoryValue )
{
    var catIndex = findCategoryIndex(categoryValue);
    var numImages = categoryList[catIndex].imageIndexes.length;    
    var index = Math.floor( Math.random() * numImages );
    showImage(categoryList[catIndex].imageIndexes[index]);
}

// ******************************************************************
// Image and metadata management
// ******************************************************************

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

//function loadImages(isLocal)
//{
//    $.getJSON(locationsFileName,
//        function(json)
//        {
//            var theIndex = 0;
//            $.each(json.items,
//                function(i,item)
//                {
//                    if ( (isLocal && item.type == "local") || 
//                         (!isLocal && item.type != "local") ||
//                         (item.type == null) )
//                        metadataList[theIndex++] = item.metadataPath;
//                }
//            );
//       
//            currentMetadataItem = 0;
//            loadMetadata( 0 );
//        }
//     );
//}
//
//function loadMetadata(metadataItem)
//{
//    var metadataFilePath = metadataList[metadataItem];
//
//    $.ajax({
//        url: metadataFilePath + "/metadata.json",
//        dataType: "json",
//        success: function(json) {
//            $.each(json.items,
//                function(i,item)
//                {
//                    if ( json.type != "words" )
//                    {
//                        var md = new metadata( item.title, item.subject, item.isNew, item.isFavorite, item.isDiscarded,
//                                               item.season, item.camera, item.lens, item.filters, item.film,
//                                               item.chrome, item.format, item.year, item.month, item.date,
//                                               item.direction, item.rating, item.caption, item.orientation );
//                        var ir = new imageRecord( metadataFilePath + "/" + item.filename, md );
//                        imageList[totalNumImages++] = ir;
//                    }
//                    else
//                    {
//                        if ( item.isNotReady == null || !item.isNotReady )
//                        {
//                            var art = new article( item.title, item.doNotShow );
//                            articleList[metadataFilePath+"/"+item.filename] = art;
//                            if ( !item.doNotShow )
//                                totalNumArticles++; // ".length" doesn't work for associative arrays
//                        }
//
//                    }
//                }
//            );
//                
//            currentMetadataItem++;
//            if ( currentMetadataItem < metadataList.length )
//            {
//                loadMetadata(currentMetadataItem);
//            }
//            else
//            {
//                completeInitialization();
//                return;
//            }
//        },
//        error: function(request, status, error) {
//            //alert("ERROR: Fetch of "+metadataFilePath+"/metadata.json failed with status "+status+" and error "+error);
//            //console.log("ERROR: Fetch of "+metadataFilePath+"/metadata.json failed with status "+status+" and error "+error);
//        }
//    });
//}

function metadata( title, subject, isNew, isFavorite, isDiscarded, season, camera, lens, filters,
                   film, chrome, format, year, month, date, direction, rating, caption, orientation )
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
    this.orientation = orientation;
    
    //this.getCategoryValue = getCategoryValue;
                        
    if ( this.date && this.date != 'Unknown' )
    {
        // See if there's a day, if not assume the first of the month
        var theDate = this.date;
        if ( theDate.substring(0, theDate.indexOf(',')-1).indexOf(' ') == -1 )
        {
            theDate = theDate.substring(0, theDate.indexOf(',')) + ' 1' + theDate.substring(theDate.indexOf(','));
        }
        
        this.theDate = new Date(theDate);
    }
    
    if ( this.theDate == null )
        this.theDate = new Date('Jan 1, 2003');
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

function article( title, doNotShow )
{
    this.title = title;
    this.doNotShow = doNotShow;
}

function currentlySelectedImageRecord( filePath )
{
    this.filePath = filePath;
}

//function getCategoryValue()
//{
//    if ( currentCategorization == null )
//    {
//        //alert("ERROR: No categorization in getCategoryValue");
//        //console.log("ERROR: No categorization in getCategoryValue");
//        return "Unknown";
//    }
//    
//    var memberName = "this." + currentCategorization; // This evaluates it into this.subject, this.season, this.camera etc...
//    var theCategoryValue = eval(memberName); // This gets the actual value of the member variable, i.e. houses, winter, nikon, etc...
//    
//    if ( theCategoryValue == null )
//        theCategoryValue = "Unknown";
//    
//    return theCategoryValue;
//}
function getCategoryValue(metadata)
{
    if ( currentCategorization == null )
    {
        //alert("ERROR: No categorization in getCategoryValue");
        //console.log("ERROR: No categorization in getCategoryValue");
        return "Unknown";
    }
    
    var theCategoryValue = metadata[currentCategorization];
    
    if ( theCategoryValue == null )
        theCategoryValue = "Unknown";
    
    return theCategoryValue;
}

function findCategories(excludeFixedCats)
{
	categoryList = categoryDictionary[currentCategorization];
//    if ( excludeFixedCats == null )
//        excludeFixedCats = false;
//        
//    categoryList = new Array();
//    
//    var newCatRecord = new categoryRecord("New");
//    var favCatRecord = new categoryRecord("Favorites");
//    
//    for ( index in imageList )
//    {
//        if ( imageList[index].metadata.isNew == 1 && !excludeFixedCats )
//        {
//            newCatRecord.imageIndexes.push(index);
//            continue;
//        }
//        
//        if ( imageList[index].metadata.isDiscarded && !excludeFixedCats ) 
//            continue;
//            
//        var categoryValue = getCategoryValue(imageList[index].metadata);
//            
//        var found = 0;
//        var foundIndex;
//        for ( catIndex in categoryList )
//        {
//            if ( categoryList[catIndex].categoryValue == categoryValue )
//            {
//                found = 1;
//                foundIndex = catIndex;
//                break;
//            }
//        }
//        
//        if ( !found )
//        {
//            catRecord = new categoryRecord(categoryValue);
//            catRecord.imageIndexes.push(index);
//            categoryList.push(catRecord);
//        }
//        else
//        {
//            categoryList[foundIndex].imageIndexes.push(index);
//        }
//        
//        if ( imageList[index].metadata.isFavorite && !excludeFixedCats )
//            favCatRecord.imageIndexes.push(index);
//    }
//    
//    categoryList.sort( function(a,b)
//    {
//        return ( b.categoryValue > a.categoryValue );
//    });
//    
//    if ( !excludeFixedCats )
//    {
//        categoryList.push(favCatRecord);
//        categoryList.push(newCatRecord);
//    }
//    
//    categoryList.reverse();
//    
//    for ( index in categoryList )
//    {
//        //console.log("Category "+categoryList[index].categoryValue+" has "+categoryList[index].imageIndexes.length+" elements");
//        categoryList[index].imageIndexes.sort( function(a,b)
//        {
//            return ( imageList[b].metadata.theDate > imageList[a].metadata.theDate );
//        });
//    }
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

function isMobilePlatform()
{
    var uagent = navigator.userAgent.toLowerCase();
    if ( uagent.search("iphone") > -1 || uagent.search("ipod") > -1 )
        return 1;

    return 0;
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

function isSafari()
{
    if ( navigator.userAgent.toLowerCase().indexOf('safari') != -1 )
        return true;
        
    return false;
}