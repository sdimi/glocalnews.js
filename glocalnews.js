google.load("feeds", "1");

var MapOptions = [
  {
      featureType: "administrative",
      elementType: "labels",
      stylers: [
        { visibility: "on" }
      ]
  }, {
      featureType: "poi",
      stylers: [
        { visibility: "off" }
      ]
  }, {
      featureType: "water",
      elementType: "labels",
      stylers: [
        { visibility: "off" }
      ]
  }, {
      featureType: "road",
      stylers: [
        { visibility: "off" }
      ]
  }, {
      featureType: "transit",
      stylers: [
        { visibility: "off" }
      ]
  }];

//Flags
var info = false;

//Geocoding
var searchTypes = {"country": 0, "administrative_area_level_1": 1, "administrative_area_level_2": 2, "administrative_area_level_3": 3, "political": 4, "locality": 5, "sublocality": 6};

var searchTypesA = ["country", "administrative_area_level_1", "administrative_area_level_2", "administrative_area_level_3", "political", "locality", "sublocality"];

var no_news_string = ["Oops! This location does not provide any news currently, ", "I couldn't find any news here...", "This place maybe isn't that popular to have any news, ", "I am sorry, but there are no news here...", "Nothing interesting..."];

var init_string = "Drag me somewhere!";

Element.prototype.remove = function () {
    this.parentNode.removeChild(this);
}

Object.defineProperty(Element.prototype, 'self',
{
    get: function () {
        var handler = create('div');
        handler.appendChild(this);
        return handler.innerHTML;
    }
});

var db = {
    cache: JSON.parse(localStorage.data) || [],
    get data()  { return this.cache },
    set data(d) { this.cache = d; setData(d) }
};

function setData(obj) {
    localStorage.data = JSON.stringify(obj)
}

function create(element, id) {
    var e = document.createElement(element);
    if (id) e.setAttribute('id', id);
    return e;
}

function remove(id) {
    var e = document.getElementById(id);
    if (e) e.remove();
}

//Zoom Properties
var zoom_max = 15;
var zoom_min = 03;

//Feeds
var feeds_max = 5;
var country_check = '';
var query = '';
var query_title = '';
var no_img = '<img src="http://static.tumblr.com/laacnol/pAsmo3h27/1370746053_knode2.png" alt="" width="80" height="65">';

function _url() {
    return 'https://news.google.com/news/feeds?pz=1&hl=' + localStorage.hl + '&ned=' + localStorage.ned + '&q=' + query + '&ie=UTF-8&output=rss';
}

var script,
    map,
    feed,
    geo,
    marker,
    infowindow;

function initialize() {
    window.ZoomChangeTriggered = false;

    map = new google.maps.Map(
        document.getElementById('map_canvas'),
        {
            mapTypeControlOptions:
                 {
                     mapTypeIds: ['MapOptions']
                 },
            center: new google.maps.LatLng(51, 0),
            maxZoom: zoom_max,
            minZoom: zoom_min,
            keyboardShortcuts: false,
            disableDefaultUI: true,
            panControl: true,
            panControlOptions: {
                position: google.maps.ControlPosition.RIGHT_TOP
            },
            zoomControl: true,
            zoomControlOptions: {
                style: google.maps.ZoomControlStyle.LARGE,
                position: google.maps.ControlPosition.RIGHT_TOP
            },
            zoom: 4,
            mapTypeId: 'MapOptions'
        }
    );

    map.fitBoundsT = function (viewport) {
        window.ZoomChangeTriggered = true;
        map.fitBounds(viewport);
    }

    map.setZoomT = function (level) {
        window.ZoomChangeTriggered = true;
        map.setZoom(level);
    }

    geo = new google.maps.Geocoder();

    marker = new google.maps.Marker({
        animation: google.maps.Animation.DROP,
        draggable: true,
        crossOnDrag: false,
        position: new google.maps.LatLng(51, 0),
        icon: 'http://static.tumblr.com/laacnol/HAYmp6b7o/pin-orange.png',
        map: map
    });

    remove('infobox');
    if (typeof window.InfoBox != undefined) {
        delete window.InfoBox;
    }
    window.script = create("script", "infobox");
    script.type = "text/javascript";
    script.src = "http://static.tumblr.com/laacnol/mNcmp5tf7/infobox.js";
    script.onload = function () {
        var myOptions = {
            content: ''
                , disableAutoPan: false
                , maxWidth: 0
                , pixelOffset: new google.maps.Size(-300, 0)
                , zIndex: null
                , boxStyle: {
                    width: '600px'
                }
                , closeBoxURL: ""
                , infoBoxClearance: new google.maps.Size(1, 1)
                , isHidden: false
                , pane: "floatPane"
                , enableEventPropagation: false

        };

        infowindow = new InfoBox(myOptions);

        map.mapTypes.set('MapOptions', new google.maps.StyledMapType(MapOptions, { name: 'MapOptions' }));

        if (localStorage.country) {
            geo.geocode({ 'address': localStorage.country }, function (results, status) {
                for (var i in results) {
                    if (results[i].types[0] == 'country') {
                        country_check = results[i].address_components[0].short_name;
                        marker.setPosition(results[i].geometry.location);
                        map.fitBoundsT(results[i].geometry.viewport);
                        loadFeed();
                    }
                }
            });
        } else {
            infowindow.setContent('<div id="feed_content" style="text-align:center;">' + init_string + '</div>');
            infowindow.open(map, marker);
        }
        
        google.maps.event.addListener(marker, 'click', function () {
            if (infowindow.getMap() == null) {
                if (infowindow.getContent() == '') {
                    loadFeed();
                }
                else
                    infowindow.open(map, marker);
            }
            else
                infowindow.close();
        });

        google.maps.event.addListener(map, 'click', function (e) {
            infowindow.close();
        });

        var dragged = false;
        window.timer = setTimeout(function () { }, 0);
        window.center = [];

        google.maps.event.addListener(map, 'idle', function () {
            center = [new google.maps.LatLng(map.getCenter().lat() - marker.getPosition().lat(),
                                             map.getCenter().lng() - marker.getPosition().lng()),
                                             map.getZoom()];

            if (!map.getBounds().contains(marker.getPosition()) && !dragged) {
                infowindow.close();
                infowindow.setContent('');
                marker.setPosition(map.getCenter());
            }
        });

        google.maps.event.addListener(map, 'zoom_changed', function () {
            if (ZoomChangeTriggered) {
                setTimeout(function () { ZoomChangeTriggered = false }, 10);
            } else if (!dragged)
                if (infowindow.getMap() != null) {
                    if (map.getZoom() != zoom_min) {
                        clearTimeout(timer);
                        timer = setTimeout(function () { loadFeed() }, 500);
                    }

                    map.panTo(new google.maps.LatLng(marker.getPosition().lat() + center[0].lat() * Math.pow(2, center[1] - map.getZoom()),
                                                     marker.getPosition().lng() + center[0].lng() * Math.pow(2, center[1] - map.getZoom())));
                } else {
                    infowindow.setContent("");
                }
        });

        google.maps.event.addListener(marker, 'dragend', function () {
            center = [new google.maps.LatLng(map.getCenter().lat() - marker.getPosition().lat(),
                                             map.getCenter().lng() - marker.getPosition().lng()),
                                             map.getZoom()];
            loadFeed();
            dragged = false;
        });

        google.maps.event.addListener(marker, 'dragstart', function () {
            dragged = true;
            infowindow.setContent("");
            infowindow.close();
        });

        google.maps.event.addListener(infowindow, 'content_changed', function () {
            if (info) {
                info = false;
                var f = db.data.filter(function (v) { return v.q == query })[0];
                if (f == null || new Date() - f.d >= 0.1 * 60 * 1000) {
                    var s = db.data;

                    feed = new google.feeds.Feed(_url());
                    feed.setNumEntries(feeds_max);
                    feed.load(function (result) {
                        if (!result.error) {
                            var wrapper = create('div');
                            wrapper.id = "feed_content";

                            var title = create('div');
                            title.id = "title";
                            title.innerHTML += '<div id="query_title">' + query_title + '</div>';
                            title.innerHTML += '<div class="aligncenter" style="width:inherit;height:0;border-top:2px solid #E67E22;font-size:0;padding-bottom:5px;">-</div>';

                            wrapper.innerHTML = title.self;
                            if (result.feed.entries.length == 0) {
                                wrapper.innerHTML += '<div style="text-align:center;">' + no_news_string[Math.floor(Math.random() * no_news_string.length)] + "try changing zoom level or drag'n'drop the marker elsewhere</div>";
                            } else {
                                var table = create('table');
                                for (var i = 0; i < result.feed.entries.length; i++) {
                                    var entry = result.feed.entries[i];
                                    var tr = create('tr');

                                    var td = create('td');
                                    td.innerHTML = getImage(entry.content);
                                    tr.appendChild(td);

                                    td = create('td');
                                    td.className = 'title_link';
                                    var link = create('a');
                                    link.href = entry.link;
                                    link.target = "_blank";
                                    link.appendChild(document.createTextNode(entry.title));
                                    td.appendChild(link);
                                    tr.appendChild(td);

                                    table.appendChild(tr);
                                }
                                wrapper.innerHTML += table.self;
                            }
                            infowindow.setContent(wrapper.self);
                        }
                        else {
                            infowindow.setContent('<div id="feed_content" style="text-align:center;">Google didn\'t repond...</div>');
                        }
                        var d = { q: query, d: (new Date()).getTime(), f: infowindow.getContent() };

                        if (f != null) {
                            for (var i = 0; i < s.length; i++) {
                                if (s[i].q == query) {
                                    s[i] = d;
                                }
                            }
                        }
                        else s.push(d);

                        db.data = s;
                        infowindow.open(map, marker);
                    });
                }
                else {
                    infowindow.setContent(f.f);
                    infowindow.open(map, marker);
                }
            }
        });
    };
    document.body.appendChild(script);  
}

function size(point) {
    return Math.sqrt(point.lat() * point.lat() + point.lng() * point.lng());
}

function getQuery(data) {
    var s = size(map.getBounds().toSpan());
    var i = 0;
    while (size(data[i].bounds.toSpan()) * 0.95 > s && i + 1 < data.length)
        i++;

    query_title = data[i].name;

    if (i == 0 && data[i].sname == country_check) {
        return ' ';
    }

    return data[i].name;
}

function loadFeed() {
    geo.geocode({ 'latLng': marker.getPosition() }, function (results, status) {
        if (status == google.maps.GeocoderStatus.OK) {
            if (results.length > 0) {
                var query_results = [];
                var temp_types = searchTypesA.slice(0);
                for (var i in results.reverse()) {
                    for (var j in temp_types) {
                        if (results[i].types[0] == temp_types[j]) {
                            temp_types.splice(j, 1);
                            query_results.push({ 'name': results[i].address_components[0].long_name, 'sname': results[i].address_components[0].short_name, 'type': results[i].types[0], 'bounds': results[i].geometry.viewport });
                        }
                    }
                }
                //sort by administrative level
                query_results.sort(function (a, b) { return searchTypes[a.type] - searchTypes[b.type] });

                var tmp = encodeURI(getQuery(query_results));

                if (query == tmp && infowindow.getContent() != '') { return }

                query = tmp;
                
                info = true;
                infowindow.setContent("");
            }
        } else {
            infowindow.setContent('<div id="feed_content" style="text-align:center;">Is it sea, or something I can\'t see ?</div>');
            infowindow.open(map, marker);
        }
    });
}

function getImage(content) {
    var cnt = create('div');
    cnt.innerHTML = content;
    var imgs = cnt.getElementsByTagName('img');
    for (var i = 0; i < imgs.length; i++) {
        if (imgs[i].hasAttribute("src") && imgs[i].src.indexOf("0.jpg") == -1) {
            imgs[i].style.height = '50px';
            var dv = create('div');
            dv.innerHTML = imgs[i].self;
            dv.className = "rounded_img";

            return dv.self;
        }
    }

    return no_img;
}

function setlang(ned, hl, country) {
    localStorage.ned = ned;
    localStorage.hl = hl;
    localStorage.country = country;
    loadScript();
}

function loadScript() {
    localStorage.ned = localStorage.ned || 'en';
    localStorage.hl = localStorage.hl || 'us';
    localStorage.country = localStorage.country || '';
    db.data = db.data.filter(function (v) { return (new Date() - v.d < 3 * 60 * 1000) && v.q != '%20' });
    remove('map_script');
    Array.prototype.slice.call(document.getElementsByTagName('script')).forEach(function (node) {
        if (/gstatic.*main\.js/.test(node.src)) node.remove()
    });
    if (typeof google.maps != undefined) {
        delete google.maps;
    }
    script = create("script", "map_script");
    script.type = "text/javascript";
    script.src = "http://maps.googleapis.com/maps/api/js?v=3.15&key=AIzaSyA950_x4X0FbGG-QiSOZ4hYkXYrtVx0ICI&sensor=true&language=" + localStorage.hl + "&callback=initialize";
    document.body.appendChild(script);
}

window.onload = loadScript;