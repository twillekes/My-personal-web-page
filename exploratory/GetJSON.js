

// Better yet, use JSON!
//$.getJSON("file:///Users/tom/play/sample.json", function(json) {
//   alert("JSON Data: " + json.name);
// });
 

//$.getJSON("file:///Users/tom/play/sample.json",
$.getJSON("http://members.shaw.ca/photonwrangler/drop/sample.json",
    function(json) {
        //alert("JSON Data: " + json.items[1].username);
        $.each(json.items,
            function(i,item)
            {
                alert(i+" "+item.username+" "+item.password);
            }
            );
 });
 
 
//var jsonstr='{"name":"George", "age":29, "friends":["John", "Sarah", "Albert"]}'
//var george=JSON.parse(jsonstr) //convert JSON string into object
//alert(george.age) //alerts 29

//<script type="text/javascript" src="http://ajax.googleapis.com/ajax/libs/jquery/1.3/jquery.min.js"></script>
//<script src="javascript/jquery-1.3.2.min.js" type="text/javascript"></script>

//jQuery.getJSON("sample.json")


//$.getJSON("http://api.flickr.com/services/feeds/photos_public.gne?jsoncallback=?",
//  {
//    user_id: "21868538@N07",
//    //tags: "cat",
//    //tagmode: "any",
//    format: "json"
//  },
//  function(data) {
//    $.each(data.items, function(i,item)
//        {
//            $("<img/>").attr("src", item.media.m).appendTo("#images");
//            //alert("ran2");
//            if ( i == 3 ) return false;
//        }
//        );
//    }
//    );


//alert("ran");
// See http://webhole.net/2009/11/28/how-to-read-json-with-javascript/