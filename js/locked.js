(function () {
    "use strict";

    var DIRECTORY = "locked-files/";

    window.onload = function () {
        getFiles();
        document.getElementById("encrypt-button").onclick = encrypt;
//        document.getElementById("file-browser-button").addEventListener("change", function (e) {
//            var reader = new FileReader();
//            reader.onload = encryptFile;
//            reader.readAsArrayBuffer(this.files[0]);
//        });
    }

    function loadFiles() {
        if (this.readyState === 4 && this.status === 200) {
            showError("");
            var container = document.implementation.createHTMLDocument().documentElement;
            container.innerHTML = this.responseText;
//            var files = container.querySelectorAll("li a");
            var files = container.querySelectorAll("a");

            var fileList = document.getElementById("file-list");
            fileList.innerHTML = "";
            // Skip the first 5 elements since they are just the column headings
            for (var i = 5; i < files.length; i++) {
                if (files[i].innerHTML === "..") {
                    continue;
                }

                /* The following creates: 
                <div class="list-group-item">
                    <div class="input-group">
                        <span class="input-group-addon"><span class="file-field"></span></span>
                        <input type="text" class="form-control">
                        <div class="input-group-btn">
                            <button type="button" class="btn btn-danger">
                                <span class="fa fa-lock fa-lg fa-fw"></span>
                            </button>
                            <button type="button" class="btn btn-danger">
                                <span class="fa fa-external-link fa-lg fa-fw"></span>
                            </button>
                        </div>
                    </div>
                </div>
                */

                var listGroupItem = document.createElement("div")
                listGroupItem.classList.add("list-group-item");
                fileList.appendChild(listGroupItem);

                var inputGroup = document.createElement("div");
                inputGroup.classList.add("input-group");
                listGroupItem.appendChild(inputGroup);

                var inputGroupAddon = document.createElement("span");
                inputGroupAddon.classList.add("input-group-addon");
                inputGroup.appendChild(inputGroupAddon);

                var fileField = document.createElement("span");
                fileField.innerHTML = files[i].innerHTML;
                fileField.classList.add("file-field");
                inputGroupAddon.appendChild(fileField);

                var passwordField = document.createElement("input");
                passwordField.type = "password";
                passwordField.classList.add("form-control");
                inputGroup.appendChild(passwordField);

                var buttonField = document.createElement("div");
                buttonField.classList.add("input-group-btn");
                inputGroup.appendChild(buttonField);

                var unlockButton = document.createElement("button");
                unlockButton.type = "button";
                unlockButton.classList.add("unlock-button");
                unlockButton.classList.add("btn");
                unlockButton.classList.add("btn-danger");
                unlockButton.setAttribute("data-filename", files[i].innerHTML);
                unlockButton.onclick = decrypt;
                buttonField.appendChild(unlockButton);

                var unlockButtonIcon = document.createElement("span");
                unlockButtonIcon.classList.add("fa");
                unlockButtonIcon.classList.add("fa-lock");
                unlockButtonIcon.classList.add("fa-lg");
                unlockButtonIcon.classList.add("fa-fw");
                unlockButton.appendChild(unlockButtonIcon);

                var openButton = document.createElement("button");
                openButton.type = "button";
                openButton.classList.add("open-button");
                openButton.classList.add("btn");
                openButton.classList.add("btn-primary");
                openButton.setAttribute("disabled", true);
                openButton.onclick = open;
                buttonField.appendChild(openButton);

                var openButtonIcon = document.createElement("span");
                openButtonIcon.classList.add("fa");
                openButtonIcon.classList.add("fa-external-link");
                openButtonIcon.classList.add("fa-lg");
                openButtonIcon.classList.add("fa-fw");
                openButton.appendChild(openButtonIcon);
            }
            fixSize();
        } else {
            showError("There was a problem getting the contents of <code>" + DIRECTORY + "</code>.");
        }
    }

    function getFiles() {
        var ajax = new XMLHttpRequest();
        ajax.onload = loadFiles;
        ajax.open("GET", DIRECTORY, true);
        ajax.send();
    }

    /*
     * Displays a given error message on the page, prefixed by "Error:".
     * 
     * @param message The error message to display. If this is the empty string,
     * the error message box will be hidden instead.
     */
    function showError(message) {
        var error = document.getElementById("error-message");

        if (message === "") {
            error.style.display = "none";
        } else {
            error.innerHTML = "<strong>Error: </strong>" + message;
            error.style.display = "block";
        }
    }

    /** Convert from an array of bytes to a bitArray. */
    function toBitArrayCodec(bytes) {
        var out = [],
            i, tmp = 0;
        for (i = 0; i < bytes.length; i++) {
            tmp = tmp << 8 | bytes[i];
            if ((i & 3) === 3) {
                out.push(tmp);
                tmp = 0;
            }
        }
        if (i & 3) {
            out.push(sjcl.bitArray.partial(8 * (i & 3), tmp));
        }
        return out;
    }

    /** Convert from a bitArray to an array of bytes. */
    function fromBitArrayCodec(arr) {
        var out = [],
            bl = sjcl.bitArray.bitLength(arr),
            i, tmp;
        for (i = 0; i < bl / 8; i++) {
            if ((i & 3) === 0) {
                tmp = arr[i / 4];
            }
            out.push(tmp >>> 24);
            tmp <<= 8;
        }
        return out;
    }

    function encrypt() {
        var password = $("#encrypt-password").val();
        $("#encrypt-output-area").val(sjcl.encrypt(password, $("#encrypt-input-area").val()));
    }

    function encryptFile(onLoadCallback) {
        console.log(this);
        console.log(onLoadCallback);
        console.log(onLoadCallback.target.result);
        //        var reader = new FileReader();
        //        reader.readAsArrayBuffer(fileData);
        //        reader.onload = function () {
        var bytes = new Uint8Array(this.result);
        var bits = toBitArrayCodec(bytes);
        var base64bits = sjcl.codec.base64.fromBits(bits);
        var crypt = sjcl.encrypt("aaaaa", base64bits);

        var base64decrypt = sjcl.decrypt("aaaaa", crypt);
        var decrypt = sjcl.codec.base64.toBits(base64decrypt);
        var byteNumbers = fromBitArrayCodec(decrypt);
        var byteArray = new Uint8Array(byteNumbers);
        console.log(byteArray);
        //            saveData(byteArray, 'png.png');
        //        }
    }

    function decrypt() {
        var button = this;
        var filename = this.getAttribute("data-filename");
        var ajax = new XMLHttpRequest();
        ajax.onload = function () {
            decryptFile(this, button);
        }

        // Change lock icon to loading icon
        $(button).children("span")[0].classList.remove("fa-lock");
        $(button).children("span")[0].classList.add("fa-spin");
        $(button).children("span")[0].classList.add("fa-spinner");

        ajax.open("GET", DIRECTORY + filename, true);
        ajax.send();
    }

    function decryptFile(xhttp, button) {
        // Reset loading icon to lock icon
        $(button).children("span")[0].classList.remove("fa-spin");
        $(button).children("span")[0].classList.remove("fa-spinner");

        if (xhttp.readyState === 4 && xhttp.status === 200) {
            showError("");

            try {
                var password = $(button).parent().siblings("input").val();
                var plaintext = sjcl.decrypt(password, xhttp.responseText);

                // Update button
                button.onclick = function () {
                    return false;
                }
                button.classList.remove("btn-danger");
                button.classList.add("btn-success");
                // Set unlock button to "unlocked" icon
                $(button).children("span")[0].classList.add("fa-unlock");
                // Enable open file button
                $(button).siblings(".open-button").attr("disabled", false);
                $(button).siblings(".open-button").attr("data-filename", button.getAttribute("data-filename"));
                $(button).siblings(".open-button").attr("data-plaintext", plaintext);
            } catch (e) {
                console.error(e);
                $(button).children("span")[0].classList.add("fa-lock");
                showError("Incorrect password");
            }
        } else {
            var filename = DIRECTORY + button.getAttribute("data-filename");
            showError("There was a problem getting the contents of <code>" + filename + "</code");
        }
    }

    function open() {
        var newWindow = window.open("", this.getAttribute("data-filename"));
        newWindow.document.write(this.getAttribute("data-plaintext"));
    }

    function fixSize() {
        var newWidth = $(".input-group").width() / 2;
        $(".file-field").css("width", newWidth + "px");
        $(".file-field").css("max-width", newWidth + "px");
    }

    $(window).resize(fixSize);
})();
