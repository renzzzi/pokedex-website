$(document).ready(function() {
    // Function to apply both search and type filters
    function applyFilters() {
        var searchValue = $("#search-bar").val().toLowerCase();
        var selectedType = $(".type-tab.active").data("type") || "all"; // Get active tab or default to "all"

        $(".pokemon-item").each(function() {
            var $this = $(this);
            var textMatch = $this.text().toLowerCase().indexOf(searchValue) > -1;
            var typeMatch = selectedType === "all" || $this.data("type") === selectedType;

            $this.toggle(textMatch && typeMatch);
        });
    }

    $("#search-bar").on("keyup", applyFilters);

    $(".type-tab").on("click", function() {
        $(".type-tab").removeClass("active");
        $(this).addClass("active"); 
        applyFilters();
    });

    applyFilters();
});

$(document).ready(function() {
    const POKEMON_PER_PAGE = 9;
    let currentPage = 1;
    let allPokemon = [];

    async function fetchAllPokemon() {
        const response = await fetch('https://pokeapi.co/api/v2/pokemon?limit=151');
        const data = await response.json();
        allPokemon = data.results;
        loadPokemonData(currentPage);
        updatePaginationControls();
    }

    async function loadPokemonData(page) {
        const start = (page - 1) * POKEMON_PER_PAGE;
        const end = start + POKEMON_PER_PAGE;
        const pokemonToLoad = allPokemon.slice(start, end);

        $('.pokemon-grid').empty();

        for (const pokemon of pokemonToLoad) {
            const detailResponse = await fetch(pokemon.url);
            const details = await detailResponse.json();
            
            const pokemonItem = `
                <div class="pokemon-item" data-type="${details.types[0].type.name}">
                    <img src="${details.sprites.front_default}" alt="${pokemon.name}">
                    <h2>${pokemon.name}</h2>
                    <p>#${String(details.id).padStart(3, '0')}</p>
                </div>
            `;
            $('.pokemon-grid').append(pokemonItem);
        }
    }

    function updatePaginationControls() {
        const totalPages = Math.ceil(allPokemon.length / POKEMON_PER_PAGE);
        $('#page-info').text(`Page ${currentPage}`);
        $('#prev-page').prop('disabled', currentPage === 1);
        $('#next-page').prop('disabled', currentPage === totalPages);
    }

    $('#prev-page').click(function() {
        if (currentPage > 1) {
            currentPage--;
            loadPokemonData(currentPage);
            updatePaginationControls();
        }
    });

    $('#next-page').click(function() {
        const totalPages = Math.ceil(allPokemon.length / POKEMON_PER_PAGE);
        if (currentPage < totalPages) {
            currentPage++;
            loadPokemonData(currentPage);
            updatePaginationControls();
        }
    });

    fetchAllPokemon();
});