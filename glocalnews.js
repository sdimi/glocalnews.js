function setData(e) {
    localStorage.data = JSON.stringify(e)
}

function create(e, t) {
    var n = document.createElement(e);
    if (t) n.setAttribute("id", t);
    return n
}

function remove(e) {
    var t = document.getElementById(e);
    if (t) t.remove()
}

function _url() {
    return "https://news.google.com/news/feeds?pz=1&hl=" + localStorage.hl + "&ned=" + localStorage.ned + "&q=" + query + "&ie=UTF-8&output=rss"
}

function initialize() {
    window.ZoomChangeTriggered = false;
    map = new google.maps.Map(document.getElementById("map_canvas"), {
        mapTypeControlOptions: {
            mapTypeIds: ["MapOptions"]
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
        mapTypeId: "MapOptions"
    });
    map.fitBoundsT = function(e) {
        window.ZoomChangeTriggered = true;
        map.fitBounds(e)
    };
    map.setZoomT = function(e) {
        window.ZoomChangeTriggered = true;
        map.setZoom(e)
    };
    geo = new google.maps.Geocoder;
    marker = new google.maps.Marker({
        animation: google.maps.Animation.DROP,
        draggable: true,
        crossOnDrag: false,
        position: new google.maps.LatLng(51, 0),
        icon: "http://static.tumblr.com/laacnol/HAYmp6b7o/pin-orange.png",
        map: map
    });
    remove("infobox");
    if (typeof InfoBox != undefined) {
        delete window.InfoBox
    }
    window.script = create("script", "infobox");
    script.type = "text/javascript";
    script.src = "http://static.tumblr.com/laacnol/mNcmp5tf7/infobox.js";
    script.onload = function() {
        var e = {
            content: "",
            disableAutoPan: false,
            maxWidth: 0,
            pixelOffset: new google.maps.Size(-300, 0),
            zIndex: null,
            boxStyle: {
                width: "600px"
            },
            closeBoxURL: "",
            infoBoxClearance: new google.maps.Size(1, 1),
            isHidden: false,
            pane: "floatPane",
            enableEventPropagation: false
        };
        infowindow = new InfoBox(e);
        map.mapTypes.set("MapOptions", new google.maps.StyledMapType(MapOptions, {
            name: "MapOptions"
        }));
        if (localStorage.country) {
            geo.geocode({
                address: localStorage.country
            }, function(e, t) {
                for (var n in e) {
                    if (e[n].types[0] == "country") {
                        country_check = e[n].address_components[0].short_name;
                        marker.setPosition(e[n].geometry.location);
                        map.fitBoundsT(e[n].geometry.viewport);
                        loadFeed()
                    }
                }
            })
        } else {
            infowindow.setContent('<div id="feed_content" style="text-align:center;">' + init_string + "</div>");
            infowindow.open(map, marker)
        }
        google.maps.event.addListener(marker, "click", function() {
            if (infowindow.getMap() == null) {
                if (infowindow.getContent() == "") {
                    loadFeed()
                } else infowindow.open(map, marker)
            } else infowindow.close()
        });
        google.maps.event.addListener(map, "click", function(e) {
            infowindow.close()
        });
        var t = false;
        window.timer = setTimeout(function() {}, 0);
        window.center = [];
        google.maps.event.addListener(map, "idle", function() {
            center = [new google.maps.LatLng(map.getCenter().lat() - marker.getPosition().lat(), map.getCenter().lng() - marker.getPosition().lng()), map.getZoom()];
            if (!map.getBounds().contains(marker.getPosition()) && !t) {
                infowindow.close();
                infowindow.setContent("");
                marker.setPosition(map.getCenter())
            }
        });
        google.maps.event.addListener(map, "zoom_changed", function() {
            if (ZoomChangeTriggered) {
                setTimeout(function() {
                    ZoomChangeTriggered = false
                }, 10)
            } else if (!t)
                if (infowindow.getMap() != null) {
                    if (map.getZoom() != zoom_min) {
                        clearTimeout(timer);
                        timer = setTimeout(function() {
                            loadFeed()
                        }, 500)
                    }
                    map.panTo(new google.maps.LatLng(marker.getPosition().lat() + center[0].lat() * Math.pow(2, center[1] - map.getZoom()), marker.getPosition().lng() + center[0].lng() * Math.pow(2, center[1] - map.getZoom())))
                } else {
                    infowindow.setContent("")
                }
        });
        google.maps.event.addListener(marker, "dragend", function() {
            center = [new google.maps.LatLng(map.getCenter().lat() - marker.getPosition().lat(), map.getCenter().lng() - marker.getPosition().lng()), map.getZoom()];
            loadFeed();
            t = false
        });
        google.maps.event.addListener(marker, "dragstart", function() {
            t = true;
            infowindow.setContent("");
            infowindow.close()
        });
        google.maps.event.addListener(infowindow, "content_changed", function() {
            if (info) {
                info = false;
                var e = db.data.filter(function(e) {
                    return e.q == query
                })[0];
                if (e == null || new Date - e.d >= .1 * 60 * 1e3) {
                    var t = db.data;
                    feed = new google.feeds.Feed(_url());
                    feed.setNumEntries(feeds_max);
                    feed.load(function(n) {
                        if (!n.error) {
                            var r = create("div");
                            r.id = "feed_content";
                            var i = create("div");
                            i.id = "title";
                            i.innerHTML += '<div id="query_title">' + query_title + "</div>";
                            i.innerHTML += '<div class="aligncenter" style="width:inherit;height:0;border-top:2px solid #E67E22;font-size:0;padding-bottom:5px;">-</div>';
                            r.innerHTML = i.self;
                            if (n.feed.entries.length == 0) {
                                r.innerHTML += '<div style="text-align:center;">' + no_news_string[Math.floor(Math.random() * no_news_string.length)] + "try changing zoom level or drag'n'drop the marker elsewhere</div>"
                            } else {
                                var o = create("table");
                                for (var u = 0; u < n.feed.entries.length; u++) {
                                    var a = n.feed.entries[u];
                                    var l = create("tr");
                                    var c = create("td");
                                    c.innerHTML = getImage(a.content);
                                    l.appendChild(c);
                                    c = create("td");
                                    c.className = "title_link";
                                    var h = create("a");
                                    h.href = a.link;
                                    h.target = "_blank";
                                    h.appendChild(document.createTextNode(a.title));
                                    c.appendChild(h);
                                    l.appendChild(c);
                                    o.appendChild(l)
                                }
                                r.innerHTML += o.self
                            }
                            infowindow.setContent(r.self)
                        } else {
                            infowindow.setContent('<div id="feed_content" style="text-align:center;">Google didn\'t repond...</div>')
                        }
                        var p = {
                            q: query,
                            d: (new Date).getTime(),
                            f: infowindow.getContent()
                        };
                        if (e != null) {
                            for (var u = 0; u < t.length; u++) {
                                if (t[u].q == query) {
                                    t[u] = p
                                }
                            }
                        } else t.push(p);
                        db.data = t;
                        infowindow.open(map, marker)
                    })
                } else {
                    infowindow.setContent(e.f);
                    infowindow.open(map, marker)
                }
            }
        })
    };
    document.body.appendChild(script)
}

function size(e) {
    return Math.sqrt(e.lat() * e.lat() + e.lng() * e.lng())
}

function getQuery(e) {
    var t = size(map.getBounds().toSpan());
    var n = 0;
    while (size(e[n].bounds.toSpan()) * .95 > t && n + 1 < e.length) n++;
    query_title = e[n].name;
    if (n == 0 && e[n].sname == country_check) {
        return " "
    }
    return e[n].name
}

function loadFeed() {
    geo.geocode({
        latLng: marker.getPosition()
    }, function(e, t) {
        if (t == google.maps.GeocoderStatus.OK) {
            if (e.length > 0) {
                var n = [];
                var r = searchTypesA.slice(0);
                for (var i in e.reverse()) {
                    for (var s in r) {
                        if (e[i].types[0] == r[s]) {
                            r.splice(s, 1);
                            n.push({
                                name: e[i].address_components[0].long_name,
                                sname: e[i].address_components[0].short_name,
                                type: e[i].types[0],
                                bounds: e[i].geometry.viewport
                            })
                        }
                    }
                }
                n.sort(function(e, t) {
                    return searchTypes[e.type] - searchTypes[t.type]
                });
                var o = encodeURI(getQuery(n));
                if (query == o && infowindow.getContent() != "") {
                    return
                }
                query = o;
                info = true;
                infowindow.setContent("")
            }
        } else {
            infowindow.setContent('<div id="feed_content" style="text-align:center;">Is it sea, or something I can\'t see ?</div>');
            infowindow.open(map, marker)
        }
    })
}

function getImage(e) {
    var t = create("div");
    t.innerHTML = e;
    var n = t.getElementsByTagName("img");
    for (var r = 0; r < n.length; r++) {
        if (n[r].hasAttribute("src") && n[r].src.indexOf("0.jpg") == -1) {
            n[r].style.height = "50px";
            var i = create("div");
            i.innerHTML = n[r].self;
            i.className = "rounded_img";
            return i.self
        }
    }
    return no_img
}

function setlang(e, t, n) {
    localStorage.ned = e;
    localStorage.hl = t;
    localStorage.country = n;
    loadScript()
}

function loadScript() {
    localStorage.ned = localStorage.ned || "en";
    localStorage.hl = localStorage.hl || "us";
    localStorage.country = localStorage.country || "";
    db.data = db.data.filter(function(e) {
        return new Date - e.d < 3 * 60 * 1e3 && e.q != "%20"
    });
    remove("map_script");
    Array.prototype.slice.call(document.getElementsByTagName("script")).forEach(function(e) {
        if (/gstatic.*main\.js/.test(e.src)) e.remove()
    });
    if (typeof google.maps != undefined) {
        delete google.maps
    }
    script = create("script", "map_script");
    script.type = "text/javascript";
    script.src = "http://maps.googleapis.com/maps/api/js?v=3.15&key=AIzaSyA950_x4X0FbGG-QiSOZ4hYkXYrtVx0ICI&sensor=true&language=" + localStorage.hl + "&callback=initialize";
    document.body.appendChild(script)
}
google.load("feeds", "1");
var MapOptions = [{
    featureType: "administrative",
    elementType: "labels",
    stylers: [{
        visibility: "on"
    }]
}, {
    featureType: "poi",
    stylers: [{
        visibility: "off"
    }]
}, {
    featureType: "water",
    elementType: "labels",
    stylers: [{
        visibility: "off"
    }]
}, {
    featureType: "road",
    stylers: [{
        visibility: "off"
    }]
}, {
    featureType: "transit",
    stylers: [{
        visibility: "off"
    }]
}];
var info = false;
var searchTypes = {
    country: 0,
    administrative_area_level_1: 1,
    administrative_area_level_2: 2,
    administrative_area_level_3: 3,
    political: 4,
    locality: 5,
    sublocality: 6
};
var searchTypesA = ["country", "administrative_area_level_1", "administrative_area_level_2", "administrative_area_level_3", "political", "locality", "sublocality"];
var no_news_string = ["Oops! This location does not provide any news currently, ", "I couldn't find any news here...", "This place maybe isn't that popular to have any news, ", "I am sorry, but there are no news here...", "Nothing interesting..."];
var init_string = "Drag me somewhere!";
Element.prototype.remove = function() {
    this.parentNode.removeChild(this)
};
Object.defineProperty(Element.prototype, "self", {
    get: function() {
        var e = create("div");
        e.appendChild(this);
        return e.innerHTML
    }
});
var db = {
    x: JSON.parse(localStorage.data || "[]"),
    get data() {
        return this.x
    },
    set data(e) {
        this.x = e;
        setData(e)
    }
};
var zoom_max = 15;
var zoom_min = 3;
var feeds_max = 5;
var country_check = "";
var query = "";
var query_title = "";
var no_img = '<img src="http://static.tumblr.com/laacnol/pAsmo3h27/1370746053_knode2.png" alt="" width="80" height="65">';
var script, map, feed, geo, marker, infowindow;
window.onload = loadScript