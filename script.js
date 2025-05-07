$(document).ready(function() {
    const POKEMON_PER_PAGE = 9;
    let currentPage = 1;
    let allPokemon = [];
    let filteredPokemon = [];
    let searchDebounceTimeout;
    let typeCache = {}; // Cache for fetched type-specific Pokémon lists
    let latestFilterRequestId = 0; // To handle race conditions from rapid filter/type clicks

    function generatePageNumbers(currentPage, totalPages) {
        const pageNumbers = $('.page-numbers');
        pageNumbers.empty();

        if (totalPages === 0) return;

        let startPage = Math.max(1, currentPage - 2);
        let endPage = Math.min(totalPages, currentPage + 2);

        if (currentPage - 1 <= 2) {
            endPage = Math.min(totalPages, 5);
        }
        if (totalPages - currentPage <= 2) {
            startPage = Math.max(1, totalPages - 4);
        }

        if (startPage > 1) {
            pageNumbers.append(`<button class="page-number" data-page="1">1</button>`);
            if (startPage > 2) {
                 pageNumbers.append(`<span>...</span>`);
            }
        }

        for (let i = startPage; i <= endPage; i++) {
            pageNumbers.append(
                `<button class="page-number ${i === currentPage ? 'active' : ''}" data-page="${i}">${i}</button>`
            );
        }

        if (endPage < totalPages) {
            if (endPage < totalPages - 1) {
                pageNumbers.append(`<span>...</span>`);
            }
            pageNumbers.append(`<button class="page-number" data-page="${totalPages}">${totalPages}</button>`);
        }
    }

    function updatePaginationControls() {
        const totalPages = Math.ceil(filteredPokemon.length / POKEMON_PER_PAGE);
        generatePageNumbers(currentPage, totalPages);
        
        $('#first-page').prop('disabled', currentPage === 1 || totalPages === 0);
        $('#prev-page').prop('disabled', currentPage === 1 || totalPages === 0);
        $('#next-page').prop('disabled', currentPage === totalPages || totalPages === 0);
        $('#last-page').prop('disabled', currentPage === totalPages || totalPages === 0);
        $('.page-number').prop('disabled', totalPages <= 1);
    }

    async function loadPokemonData(page) {
        const start = (page - 1) * POKEMON_PER_PAGE;
        const end = start + POKEMON_PER_PAGE;
        const pokemonToLoad = filteredPokemon.slice(start, end);
        const grid = $('.pokemon-grid');

        const loadingDiv = grid.find('.loading');
        grid.empty();
        if (loadingDiv.length) {
            grid.append(loadingDiv);
        }

        try {
            if (pokemonToLoad.length > 0) {
                for (const pokemon of pokemonToLoad) {
                    try {
                        const detailResponse = await fetch(pokemon.url);
                        if (!detailResponse.ok) {
                            console.error(`Failed to fetch details for ${pokemon.name}: ${detailResponse.statusText}`);
                            grid.append(`<div class="pokemon-item error">Failed to load ${pokemon.name}</div>`);
                            continue;
                        }
                        const details = await detailResponse.json();
                        
                        const imageUrl = details.sprites?.front_default;
                        const pokemonId = details.id;
                        const primaryType = details.types?.[0]?.type?.name;

                        if (!imageUrl || pokemonId === undefined || !primaryType) {
                             console.warn(`Incomplete data for ${pokemon.name}, rendering with placeholder or skipping.`);
                             grid.append(`<div class="pokemon-item error">Data incomplete for ${pokemon.name}</div>`);
                             continue;
                        }

                        const pokemonItem = `
                            <div class="pokemon-item" data-type="${primaryType}">
                                <img src="${imageUrl}" alt="${pokemon.name}">
                                <h2>${pokemon.name}</h2>
                                <p>#${String(pokemonId).padStart(3, '0')}</p>
                            </div>
                        `;
                        grid.append(pokemonItem);
                    } catch (itemError) {
                        console.error(`Error processing Pokemon ${pokemon.name}:`, itemError);
                        grid.append(`<div class="pokemon-item error">Error loading ${pokemon.name}</div>`);
                    }
                }
            }
        } finally {
            grid.find('.loading').remove();
            if (grid.children().length === 0) {
                if (filteredPokemon.length === 0) {
                    grid.append('<div class="info-message">No Pokémon match your criteria.</div>');
                } else {
                    grid.append('<div class="info-message">No Pokémon to display on this page.</div>');
                }
            }
        }
    }

    async function filterPokemon() {
        latestFilterRequestId++; // Increment for each new call
        const currentRequestId = latestFilterRequestId; // Capture ID for this specific call

        const searchTerm = $('#search-bar').val().toLowerCase();
        const selectedType = $('.type-tab.active').data('type');
        
        let loadingMessage = "Filtering Pokémon...";
        if (selectedType && selectedType !== 'all' && !typeCache[selectedType]) {
            loadingMessage = `Loading ${selectedType} Pokémon...`;
        }
        $('.pokemon-grid').empty().append(`<div class="loading">${loadingMessage}</div>`);

        let pokemonListToFilter = []; // This will hold the base list (all or type-specific) before search term filtering

        if (!allPokemon || allPokemon.length === 0) {
            console.warn("Master Pokémon list (allPokemon) is not yet loaded. Filtering may be incomplete.");
        }

        if (selectedType && selectedType !== 'all') {
            if (typeCache[selectedType]) {
                pokemonListToFilter = typeCache[selectedType];
            } else {
                try {
                    // Fetch Pokémon list for the specific type
                    const response = await fetch(`https://pokeapi.co/api/v2/type/${selectedType}`);
                    if (!response.ok) {
                        throw new Error(`Failed to fetch type ${selectedType}: ${response.status}`);
                    }
                    const typeData = await response.json();
                    // The API returns {pokemon: [{pokemon: {name, url}}, ...]}
                    pokemonListToFilter = typeData.pokemon.map(p_item => p_item.pokemon);
                    typeCache[selectedType] = pokemonListToFilter; // Cache it for future use
                } catch (error) {
                    console.error(`Error fetching Pokémon for type ${selectedType}:`, error);
                    if (currentRequestId === latestFilterRequestId) { // Only update UI if this is the latest request
                        $('.pokemon-grid').empty().append(`<div class="error">Could not load ${selectedType} Pokémon. ${error.message}</div>`);
                        filteredPokemon = [];
                        currentPage = 1;
                        updatePaginationControls();
                    }
                    return;
                }
            }
        } else {
            pokemonListToFilter = allPokemon;
        }

        // If a new filter request came in while fetching/processing, abort this one's UI update.
        if (currentRequestId !== latestFilterRequestId) {
            console.log(`Filter request ${currentRequestId} for type '${selectedType}' became outdated. Aborting UI update.`);
            return;
        }
        
        if (searchTerm) {
            filteredPokemon = pokemonListToFilter.filter(pokemon =>
                pokemon.name.toLowerCase().includes(searchTerm)
            );
        } else {
            filteredPokemon = [...pokemonListToFilter]; // Use a copy of the list
        }

        currentPage = 1;
        
        try {
            await loadPokemonData(currentPage);
        } catch (error) {
            if (currentRequestId === latestFilterRequestId) {
                console.error("Error loading Pokemon data after filter:", error);
                $('.pokemon-grid').empty().append('<div class="error">Could not load Pokémon after filtering.</div>');
            }
        } finally {
            if (currentRequestId === latestFilterRequestId) { // Final check before updating pagination
                updatePaginationControls();
            }
        }
    }

    async function fetchAllPokemon() {
        $('.pokemon-grid').empty().append('<div class="loading">Initializing Pokedex...</div>');
        try {
            const response = await fetch('https://pokeapi.co/api/v2/pokemon?limit=1008');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            allPokemon = data.results;
            filteredPokemon = [...allPokemon];
            currentPage = 1;
            await loadPokemonData(currentPage);
        } catch (error) {
            console.error("Failed to fetch initial Pokemon list:", error);
            $('.pokemon-grid').empty().append(`<div class="error">Could not load Pokedex. ${error.message}. Please try refreshing.</div>`);
            $('#search-bar, .type-tab, .pagination button').prop('disabled', true);
        } finally {
            updatePaginationControls();
        }
    }

    // Debounced search handler
    $('#search-bar').on('keyup', function() {
        clearTimeout(searchDebounceTimeout);
        const currentSearchTerm = $(this).val(); // To pass to the timeout for a more robust race condition check if needed
        searchDebounceTimeout = setTimeout(() => {
            filterPokemon().catch(err => {
                 console.error("Unhandled error during search filtering:", err);
                 // Error UI update is handled within filterPokemon based on latestFilterRequestId
            });
        }, 300); // 300ms debounce
    });
    
    $('.type-tab').click(function() {
        clearTimeout(searchDebounceTimeout); // Clear any pending debounced search
        $('.type-tab').removeClass('active');
        $(this).addClass('active');
        filterPokemon().catch(err => {
            console.error("Unhandled error during type filtering:", err);
            // Error UI update is handled within filterPokemon
        });
    });

    async function handlePageChange(newPage) {
        const totalPages = Math.ceil(filteredPokemon.length / POKEMON_PER_PAGE);
        if (currentPage !== newPage && newPage >= 1 && (newPage <= totalPages || totalPages === 0)) {
            currentPage = newPage;
            $('.pokemon-grid').empty().append('<div class="loading">Loading next page...</div>');
            try {
                await loadPokemonData(currentPage);
            } catch (error) {
                console.error("Error loading page data:", error);
                 $('.pokemon-grid').empty().append('<div class="error">Could not load this page.</div>');
            } finally {
                updatePaginationControls();
            }
        }
    }

    $('#first-page').click(() => handlePageChange(1));
    $('#last-page').click(() => {
        const totalPages = Math.ceil(filteredPokemon.length / POKEMON_PER_PAGE);
        handlePageChange(totalPages > 0 ? totalPages : 1);
    });
    $(document).on('click', '.page-number:not(.active)', function() {
        const newPage = parseInt($(this).data('page'));
        handlePageChange(newPage);
    });
    $('#prev-page').click(() => handlePageChange(currentPage - 1));
    $('#next-page').click(() => handlePageChange(currentPage + 1));

    fetchAllPokemon();
});