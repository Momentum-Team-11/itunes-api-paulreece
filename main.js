var redirect_uri = "http://127.0.0.1:5500/";

var client_id = "05af6e734df0448f83bff5cc4284fe53";
var client_secret = "bf21043597334276a1e0cda354138ae5"; // In a real app you should not expose your client_secret to the user

var access_token = null;
var refresh_token = null;
var currentPlaylist = "";
var radioButtons = [];
var searchTerm = document.getElementById("query");

const AUTHORIZE = "https://accounts.spotify.com/authorize";
const TOKEN = "https://accounts.spotify.com/api/token";
const SEARCH = "https://api.spotify.com/v1/search?q=";

function onPageLoad() {
  client_id = localStorage.getItem("client_id");
  client_secret = localStorage.getItem("client_secret");
  if (window.location.search.length > 0) {
    handleRedirect();
  } else {
    access_token = localStorage.getItem("access_token");
    if (access_token == null) {
      // we don't have an access token so present token section
      document.getElementById("tokenSection").style.display = "block";
    } else {
      // we have an access token so present device section
      document.getElementById("deviceSection").style.display = "block";
    }
  }
}

function handleRedirect() {
  let code = getCode();
  fetchAccessToken(code);
  window.history.pushState("", "", redirect_uri); // remove param from url
}

function getCode() {
  let code = null;
  const queryString = window.location.search;
  if (queryString.length > 0) {
    const urlParams = new URLSearchParams(queryString);
    code = urlParams.get("code");
  }
  return code;
}

function requestAuthorization() {
  client_id = document.getElementById("clientId").value;
  client_secret = document.getElementById("clientSecret").value;
  localStorage.setItem("client_id", client_id);
  localStorage.setItem("client_secret", client_secret); // In a real app you should not expose your client_secret to the user

  let url = AUTHORIZE;
  url += "?client_id=" + client_id;
  url += "&response_type=code";
  url += "&redirect_uri=" + encodeURI(redirect_uri);
  url += "&show_dialog=true";
  url +=
    "&scope=user-read-private user-read-email user-modify-playback-state user-read-playback-position user-library-read streaming user-read-playback-state user-read-recently-played playlist-read-private";
  window.location.href = url; // Show Spotify's authorization screen
}

function fetchAccessToken(code) {
  let body = "grant_type=authorization_code";
  body += "&code=" + code;
  body += "&redirect_uri=" + encodeURI(redirect_uri);
  body += "&client_id=" + client_id;
  body += "&client_secret=" + client_secret;
  callAuthorizationApi(body);
}

function refreshAccessToken() {
  refresh_token = localStorage.getItem("refresh_token");
  let body = "grant_type=refresh_token";
  body += "&refresh_token=" + refresh_token;
  body += "&client_id=" + client_id;
  callAuthorizationApi(body);
}

function callAuthorizationApi(body) {
  let xhr = new XMLHttpRequest();
  xhr.open("POST", TOKEN, true);
  xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
  xhr.setRequestHeader(
    "Authorization",
    "Basic " + btoa(client_id + ":" + client_secret)
  );
  xhr.send(body);
  xhr.onload = handleAuthorizationResponse;
}

function handleAuthorizationResponse() {
  if (this.status == 200) {
    var data = JSON.parse(this.responseText);
    console.log(data);
    var data = JSON.parse(this.responseText);
    if (data.access_token != undefined) {
      access_token = data.access_token;
      localStorage.setItem("access_token", access_token);
    }
    if (data.refresh_token != undefined) {
      refresh_token = data.refresh_token;
      localStorage.setItem("refresh_token", refresh_token);
    }
    onPageLoad();
  } else {
    console.log(this.responseText);
    alert(this.responseText);
  }
}

function callApi(method, url, body, callback) {
  let xhr = new XMLHttpRequest();
  xhr.open(method, url, true);
  xhr.setRequestHeader("Content-Type", "application/json");
  xhr.setRequestHeader("Authorization", "Bearer " + access_token);
  xhr.send(body);
  xhr.onload = callback;
}

function removeAllItems(elementId) {
  let node = document.getElementById(elementId);
  while (node.firstChild) {
    node.removeChild(node.firstChild);
  }
}

function handleApiResponse() {
  if (this.status == 200) {
    console.log(this.responseText);
    setTimeout(currentlyPlaying, 2000);
  } else if (this.status == 204) {
    setTimeout(currentlyPlaying, 2000);
  } else if (this.status == 401) {
    refreshAccessToken();
  } else {
    console.log(this.responseText);
    alert(this.responseText);
  }
}

function handleCurrentlyPlayingResponse() {
  if (this.status == 200) {
    var data = JSON.parse(this.responseText);
    console.log(data);
    if (data.item != null) {
      document.getElementById("albumImage").src = data.item.album.images[0].url;
      document.getElementById("trackTitle").innerHTML = data.item.name;
      document.getElementById("trackArtist").innerHTML =
        data.item.artists[0].name;
    }

    if (data.device != null) {
      // select device
      currentDevice = data.device.id;
      document.getElementById("devices").value = currentDevice;
    }

    if (data.context != null) {
      // select playlist
      currentPlaylist = data.context.uri;
      currentPlaylist = currentPlaylist.substring(
        currentPlaylist.lastIndexOf(":") + 1,
        currentPlaylist.length
      );
      document.getElementById("playlists").value = currentPlaylist;
    }
  } else if (this.status == 204) {
  } else if (this.status == 401) {
    refreshAccessToken();
  } else {
    console.log(this.responseText);
    alert(this.responseText);
  }
}

function refreshAlbums() {
  callApi(
    "GET",
    SEARCH + query.value + "&type=track&include_external=audio",
    null,
    handleAlbumsResponse
  );
}

function handleAlbumsResponse() {
  if (this.status == 200) {
    var data = JSON.parse(this.responseText);
    console.log(data);
    removeAllItems("albums");
    data.tracks.items.forEach((item) => addAlbum(item));
  } else if (this.status == 401) {
    refreshAccessToken();
  } else {
    console.log(this.responseText);
    alert(this.responseText);
  }
}

function addAlbum(item) {
  let node = document.createElement("div");
  let img = '<img src="' + item.album.images[1].url + '"/>';
  let prev = document.getElementById("prev");
  let prevURL = item.preview_url;
  console.log(prevURL);
  let audio = document.getElementById("audio");
  let songName =
    '<input class="button" id= "' +
    prevURL +
    '" type="button" value="' +
    item.name +
    '">';
  //   prev.innerHTML +=
  //     '<audio controls class="audio" id= "audio" type="button"  src="' +
  //     prevURL +
  //     '">';
  document.getElementById("albums").addEventListener("click", function (e) {
    console.log(e.target);
    audio.removeAttribute("src", e.target.id);
    audio.setAttribute("src", e.target.id);
    audio.play;
  });
  node.class = "songBox";
  node.innerHTML =
    img +
    "<br>" +
    songName +
    "<br>" +
    "Artist: " +
    item.artists[0].name +
    "<br>" +
    "Album: " +
    item.album.name +
    "<br>" +
    "Release Date: " +
    new Date(item.album.release_date).toDateString();
  document.getElementById("albums").appendChild(node);
}

// document
//   .getElementById("audio")
//   .addEventListener("click", function playSong(e) {
//     document.getElementById("audio").play;
//   });
// let clicked = document
//   .getElementById("ply")
//   .addEventListener("click", function () {
//     console.log("1");
//   });
// let ply = document.getElementById("ply");
// ply.addEventListener("click", function () {
//   console.log("clicked");
// });
// '" onclick="audio.setAttribute(src,' +
// prevURL +
