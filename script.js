$(document).ready(function() {
    const POKEMON_PER_PAGE = 9;
    let currentPage = 1;
    let allPokemon = [];
    let filteredPokemon = [];

    function generatePageNumbers(currentPage, totalPages) {
        const pageNumbers = $('.page-numbers');
        pageNumbers.empty();

        let startPage = Math.max(1, currentPage - 2);
        let endPage = Math.min(totalPages, currentPage + 2);

        if (startPage > 1) {
            pageNumbers.append(`
                <button class="page-number" data-page="1">1</button>
                <span>...</span>
            `);
        }

        for (let i = startPage; i <= endPage; i++) {
            pageNumbers.append(`
                <button class="page-number ${i === currentPage ? 'active' : ''}" 
                        data-page="${i}">${i}</button>
            `);
        }

        if (endPage < totalPages) {
            pageNumbers.append(`
                <span>...</span>
                <button class="page-number" data-page="${totalPages}">${totalPages}</button>
            `);
        }
    }

    function updatePaginationControls() {
        const totalPages = Math.ceil(filteredPokemon.length / POKEMON_PER_PAGE);
        generatePageNumbers(currentPage, totalPages);
        
        $('#first-page').prop('disabled', currentPage === 1);
        $('#prev-page').prop('disabled', currentPage === 1);
        $('#next-page').prop('disabled', currentPage === totalPages);
        $('#last-page').prop('disabled', currentPage === totalPages);
    }

    async function loadPokemonData(page) {
        const start = (page - 1) * POKEMON_PER_PAGE;
        const end = start + POKEMON_PER_PAGE;
        const pokemonToLoad = filteredPokemon.slice(start, end);

        $('.pokemon-grid').empty();
        $('.pokemon-grid').append('<div class="loading">Loading Pokemon...</div>');

        try {
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
        } finally {
            $('.loading').remove();
        }
    }

    async function filterPokemon() {
        const searchTerm = $('#search-bar').val().toLowerCase();
        const selectedType = $('.type-tab.active').data('type');

        if (!selectedType || selectedType === 'all') {
            filteredPokemon = allPokemon.filter(pokemon => 
                pokemon.name.toLowerCase().includes(searchTerm)
            );
        } else {
            filteredPokemon = [];
            for (const pokemon of allPokemon) {
                if (!pokemon.name.toLowerCase().includes(searchTerm)) continue;
                
                const detailResponse = await fetch(pokemon.url);
                const details = await detailResponse.json();
                if (details.types.some(t => t.type.name === selectedType)) {
                    filteredPokemon.push(pokemon);
                }
            }
        }

        currentPage = 1;
        loadPokemonData(currentPage);
        updatePaginationControls();
    }

    async function fetchAllPokemon() {
        const response = await fetch('https://pokeapi.co/api/v2/pokemon?limit=1008');
        const data = await response.json();
        allPokemon = data.results;
        filteredPokemon = allPokemon;
        loadPokemonData(currentPage);
        updatePaginationControls();
    }

    $('#search-bar').on('keyup', filterPokemon);
    
    $('.type-tab').click(function() {
        $('.type-tab').removeClass('active');
        $(this).addClass('active');
        filterPokemon();
    });

    $('#first-page').click(function() {
        if (currentPage !== 1) {
            currentPage = 1;
            loadPokemonData(currentPage);
            updatePaginationControls();
        }
    });

    $('#last-page').click(function() {
        const totalPages = Math.ceil(filteredPokemon.length / POKEMON_PER_PAGE);
        if (currentPage !== totalPages) {
            currentPage = totalPages;
            loadPokemonData(currentPage);
            updatePaginationControls();
        }
    });

    $(document).on('click', '.page-number', function() {
        const newPage = parseInt($(this).data('page'));
        if (currentPage !== newPage) {
            currentPage = newPage;
            loadPokemonData(currentPage);
            updatePaginationControls();
        }
    });

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
