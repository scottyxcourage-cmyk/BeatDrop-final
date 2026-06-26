document.addEventListener("DOMContentLoaded", () => {

  const watchBtn = document.querySelector(".watch-btn");
  const listenBtn = document.querySelector(".listen-btn");
  const exploreBtn = document.querySelector(".explore-btn");

  watchBtn.addEventListener("click", () => {
    document.getElementById("movies").scrollIntoView({
      behavior: "smooth"
    });
  });

  listenBtn.addEventListener("click", () => {
    document.getElementById("music").scrollIntoView({
      behavior: "smooth"
    });
  });

  exploreBtn.addEventListener("click", () => {
    document.getElementById("trending").scrollIntoView({
      behavior: "smooth"
    });
  });

});
