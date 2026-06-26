const musicGrid =
document.getElementById("musicGrid");

/*
CONNECT LATER TO:

Spotify API
Audius API
Last.fm API
Deezer API

*/

const demoMusic = [

{
title:"Loading Music API...",
artist:"Artist",
cover:"https://picsum.photos/300/400"
}

];

demoMusic.forEach(song=>{

musicGrid.innerHTML += `

<div class="card">

<img src="${song.cover}">

<div class="card-content">

<h3>${song.title}</h3>

<p>${song.artist}</p>

<button>
Play
</button>

</div>

</div>

`;

});
