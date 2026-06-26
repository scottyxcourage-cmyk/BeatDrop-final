const movieGrid =
document.getElementById("movieGrid");

// YOUR BACKEND API
const API =
"/api/trending";

async function loadMovies(){

try{

const response =
await fetch(API);

const data =
await response.json();

movieGrid.innerHTML="";

data.results.forEach(movie=>{

movieGrid.innerHTML += `
<div class="card">

<img loading="lazy"
src="https://image.tmdb.org/t/p/w500${movie.poster_path}">

<div class="card-content">

<h3>${movie.title}</h3>

<p>
⭐ ${movie.vote_average}
</p>

<button>
Watch Now
</button>

</div>

</div>
`;

});

}catch(err){

console.error(err);

}

}

loadMovies();
