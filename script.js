$(document).ready(function() {
    const POKEMON_PER_PAGE = 9;
    let currentPage = 1;
    let allPokemon = [];
    let filteredPokemon = [];

    async function fetchAllPokemon() {
        const response = await fetch('https://pokeapi.co/api/v2/pokemon?limit=151');
        const data = await response.json();
        allPokemon = data.results;
        filteredPokemon = allPokemon;
        loadPokemonData(currentPage);
        updatePaginationControls();
    }

    async function filterPokemon() {
        const searchTerm = $('#search-bar').val().toLowerCase();
        const selectedType = $('.type-tab.active').data('type');

        filteredPokemon = allPokemon.filter(pokemon => 
            pokemon.name.toLowerCase().includes(searchTerm)
        );

        if (selectedType && selectedType !== 'all') {
            const tempFiltered = [];
            for (const pokemon of filteredPokemon) {
                const detailResponse = await fetch(pokemon.url);
                const details = await detailResponse.json();
                if (details.types.some(t => t.type.name === selectedType)) {
                    tempFiltered.push(pokemon);
                }
            }
            filteredPokemon = tempFiltered;
        }

        currentPage = 1;
        loadPokemonData(currentPage);
        updatePaginationControls();
    }

    $('#search-bar').on('keyup', filterPokemon);
    
    $('.type-tab').click(function() {
        $('.type-tab').removeClass('active');
        $(this).addClass('active');
        filterPokemon();
    });

    async function loadPokemonData(page) {
        const start = (page - 1) * POKEMON_PER_PAGE;
        const end = start + POKEMON_PER_PAGE;
        const pokemonToLoad = filteredPokemon.slice(start, end);

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
        const totalPages = Math.ceil(filteredPokemon.length / POKEMON_PER_PAGE);
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
        const totalPages = Math.ceil(filteredPokemon.length / POKEMON_PER_PAGE);
        if (currentPage < totalPages) {
            currentPage++;
            loadPokemonData(currentPage);
            updatePaginationControls();
        }
    });

    fetchAllPokemon();
});