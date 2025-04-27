$(document).ready(function() {
    $("#search-bar").on("keyup", function() {
        var value = $(this).val().toLowerCase();
        $(".pokemon-item").filter(function() {
            $(this).toggle($(this).text().toLowerCase().indexOf(value) > -1)
        });
    });

    $(".type-tab").on("click", function() {
        var type = $(this).data("type");
        if (type === "all") {
            $(".pokemon-item").show();
        } else {
            $(".pokemon-item").hide();
            $(".pokemon-item[data-type='" + type + "']").show();
        }
    });
});