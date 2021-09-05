// fade out for flash messages
setTimeout(function () {
     $("#flash-msg").fadeOut("slow");
}, 3000);

setTimeout(function () {
    $("#success").fadeOut("slow");
}, 3000);

setTimeout(function () {
    $("#error").fadeOut("slow");
}, 3000);

document.getElementById("year").innerHTML = new Date().getFullYear();

function submitForm(action) {
    var form = document.getElementById('editCatForm');
    form.action = action;
    form.submit();
}
