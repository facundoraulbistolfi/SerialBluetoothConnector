/*
CREATED BY: Facundo Bistolfi
*/

//STATUS CONSTANTES
const REFRESHING = 1;
const READY = 2;

const UUID_SERVICE = "cc88c38f-5da3-4ae2-aaf0-9a22f8f4d5f7";
const UUID_CHARACTERISTIC = "29619ec5-2799-4a46-8c81-fca529cd56f3";

const TAM_HEADER = 100;
const BYTES_REG = 7;
const CANT_REG = 30;

//Variable: Lista de dispositivos
var foundedDevices = [];
var buffer = [];

var app = {
    // Application Constructor
    initialize: function () {
        //Eventos
        document.addEventListener("backbutton", onBackKeyDown, false);
        document.addEventListener("deviceready", app.onDeviceReady);
        //Elementos 
        document.getElementById("tab1").addEventListener("click", () => { app.openPage(1) });
        document.getElementById("tab2").addEventListener("click", () => { app.openPage(2) });
        document.getElementById("tab3").addEventListener("click", () => { app.openPage(3) });
        document.getElementById("botonRefresh").addEventListener("click", app.refreshDevices);
        //document.getElementById("botonCancel").addEventListener("click", app.cancelRefresh);
        document.getElementById("buttonSend").addEventListener("click", app.onButtonSend);
        document.getElementById("buttonClear").addEventListener("click", app.onClearChat);
        document.getElementById("botonCancelCon").addEventListener("click", app.onCancelConnection);
        //Detectar plataforma

        //document.getElementById("platformId").innerText = window.cordova.platformId;
        //Empezar en pagina 1;
        app.openPage(1);
    },
    onDeviceReady: function () {
        //Activar bluetooth
        bluetoothSerial.enable(
            function () {
                app.changeStatus("Bluetooth enabled");
            },
            function () {
                app.changeStatus("Error: Bluetooth not enabled");
                document.getElementById("botonRefresh").disabled = true;
            }
        );
    },
    //Actualizar lista de dispositivos Bluetooth
    refreshDevices: function () {
        // Borrar lista
        foundedDevices = [];
        //Actualizar elementos visuales
        document.getElementById("tabla_dispositivos").innerHTML = "";
        //document.getElementById("botonRefresh").innerHTML = "Buscando...";
        //document.getElementById("botonRefresh").disabled = true;
        document.getElementById("botonCancel").disabled = false;

        //En el caso de ser una aplicación android, los dispositivos que no estan emparejados
        //se deben traer con bluetoothSerial.discoverUnpaired()
        if (window.cordova.platformId === "android")
            bluetoothSerial.discoverUnpaired(app.actualizarLista, app.onError);

        //bluetoothSerial.list()
        //En android: trae los dispositivos emparejados
        //En iOS: trae los dispositivos LTE cercanos
        bluetoothSerial.list(app.actualizarLista, app.onError);
    },
    cancelRefresh: function () {
        /*
        bluetoothle.stopScan((msj) => {
            document.getElementById("botonRefresh").disabled = false;
            document.getElementById("botonCancel").disabled = true;
            document.getElementById("botonRefresh").innerHTML = "Refresh";
            app.log("CANCEL: " + msj);
        }, app.onError);
        */

        //TODO: Ver la forma de ver el progreso o algo asi

    },
    actualizarLista: function (list) {
        app.log("Actualizar lista");
        list.forEach(app.addToList);
        document.getElementById("botonRefresh").disabled = false;
        document.getElementById("botonCancel").disabled = true;
        document.getElementById("botonRefresh").innerHTML = "Refresh";
    },
    //Añadir elemento a la lista
    addToList: function (result) {
        //Revisa si ya existe un dispositivo con esa id para no tener duplicados en la lista
        var yaExiste = foundedDevices.some((device) => { return device.id === result.id; });
        //Si es un dispositivo nuevo se agrega a la lista y a la tabla
        if (!yaExiste) {
            foundedDevices.push(result);
            var listItem = document.createElement('tr');
            listItem.innerHTML =
                '<td class="">' + result.id + '</td>' +
                '<td class="">' + result.name + '</td>';
            document.getElementById("tabla_dispositivos").appendChild(listItem);
            listItem.addEventListener('click', () => { app.bleConnectionRequest(result.id) });
        }
    },
    //Mostrar Error
    onError: function (err) {
        app.log("ERROR: " + JSON.stringify(err));
        alert("ERROR: " + JSON.stringify(err));
    },
    //Conectar al dispositivo
    bleConnectionRequest: function (device_id) {
        app.log("Conectar a:" + device_id)
        if (confirm("Conectarse a " + device_id + "?")) {
            bluetoothSerial.connect(device_id, () => {
                app.openPage(2);
                bluetoothSerial.clear(() => { app.log("Buffer cleared") }, app.onError);
                bluetoothSerial.subscribeRawData(app.onReceiveMessage, app.onError);

            }, app.onError);
        }
    },
    //Cambiar de pagina
    openPage: function (n) {
        tabName = "tab" + n;
        pageName = 'tab_cont' + n;

        var i, tabcontent, tablinks;
        tabcontent = document.getElementsByClassName("tabcontent");
        for (i = 0; i < tabcontent.length; i++) {
            tabcontent[i].style.display = "none";
        }
        tablinks = document.getElementsByClassName("tablink");
        for (i = 0; i < tablinks.length; i++) {
            tablinks[i].className = tablinks[i].className.replace(" active", "");
        }
        document.getElementById(pageName).style.display = "block";
        document.getElementById(tabName).className += " active";
        //evt.currentTarget.className += " active";
    },
    // Enviar data
    onButtonSend: function () {
        var send = new Uint8Array([12]);
        app.log("SEND COMMAND");
        bluetoothSerial.write(send, () => {
            document.getElementById("chat").innerHTML = "";
            app.log("Comando enviado");
            buffer = [];
        }, app.onError);
    },
    // Recibir data (Como un array buffer)
    onReceiveMessage: function (buffer_in) {
        var data = Array.from(new Int8Array(buffer_in));

        //app.log("IN buffer_in: " + buffer_in);
        //app.log("typeof buffer: " + typeof buffer);
        //app.log("IN DATA: " + data);
        buffer = buffer.concat(data);
        //app.log("buffer: " + buffer.toString());
        //app.log("length buffer: " + buffer.length);
        if (buffer.length >= (TAM_HEADER + BYTES_REG * CANT_REG)) {
            //Procesar datos
            //document.getElementById("chat").innerHTML = buffer.toString();
            app.log("buffer: " + buffer.toString());
            app.procesarBuffer();

        }
        /*
        for (var i in data)
            document.getElementById("chat").innerHTML = document.getElementById("chat").innerHTML + " " + data[i];
        */
    },
    procesarBuffer: function () {
        var mensaje = String.fromCharCode.apply(String, buffer.slice(0, TAM_HEADER));
        document.getElementById("chat").innerHTML = "Header: " + mensaje + "\n";
        app.log("Procesar lista de registros");
        var listaRegistros = [CANT_REG];
        for (var i = 0; i < CANT_REG; i++) {
            app.log("Registro " + (i + 1));
            var offset = TAM_HEADER + BYTES_REG * i;
            listaRegistros[i] = {
                "Dia": (buffer[offset++] + 1900) + "/" + buffer[offset++] + "/" + buffer[offset++],
                "Hora": buffer[offset++] + ":" + buffer[offset++],
                "Temp": app.getTemperatura(buffer[offset++], buffer[offset++])
            };
            document.getElementById("chat").innerHTML = document.getElementById("chat").innerHTML + JSON.stringify(listaRegistros[i]) + "\n";
        }
        buffer = [];
    },
    getTemperatura: function (temp1, temp2) {
        var temp = temp1 & 0x7;	// cargar 3 bits de MSB con una mascara
        temp = temp << 8;
        temp = (temp | temp2);	 // cargar los 8 bits restantes en LSB
        if (temp1 > 0x80)	// procesar el signo
            temp = temp * -1;
        return (temp / 16);
    },
    // Boton cancelar conexion
    onCancelConnection: function () {
        if (confirm("Desea terminar la conexión?")) {
            bluetoothSerial.unsubscribeRawData(() => {
                app.log("Cerrar conexion");
                app.openPage(1);
            }, app.onError);
        }
    },
    // Boton limpiar chat
    onClearChat: function () {
        app.log("Limpiar chat");
        document.getElementById("chat").innerHTML = "";
    },
    // Log info
    log: function (msj) {
        document.getElementById("log").value = document.getElementById("log").value + msj + '\n';
    },
    changeStatus: function (msj) {
        document.getElementById("labelStatus").innerHTML = msj;
    }
};

app.initialize();

function onBackKeyDown(e) {
    e.preventDefault();
    alert('Hola tocaste el back button bien ahi pero no hace nada');
}

