/*
CREATED BY: Facundo Bistolfi
*/

//STATUS CONSTANTES
const REFRESHING = 1;
const READY = 2;

const UUID_SERVICE = "cc88c38f-5da3-4ae2-aaf0-9a22f8f4d5f7";
const UUID_CHARACTERISTIC = "29619ec5-2799-4a46-8c81-fca529cd56f3";

const COMMAND_DATA = 'w';
const COMMAND_HEADER = 'h';
const COMMAND_SET_HOUR = 's';
const COMMAND_GET_HOUR = 'g';

const BYTES_REG = 8;
const CARACTER_END_ROW = (new Uint8Array([0x3b]))[0]; //';'
const CARACTER_END_DATA = (new Uint8Array([0xff]))[0];
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
        document.getElementById("buttonData").addEventListener("click", app.onButtonSendData);
        document.getElementById("buttonHeader").addEventListener("click", app.onButtonSendHeader);
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
    //Enviar comando header
    onButtonSendHeader: function () {
        bluetoothSerial.write("PUTA MADRE", () => {
            app.log("Comando header");
        }, app.onError);
    },
    // Enviar comando data
    onButtonSendData: function () {
        var send = new Uint8Array([COMMAND_DATA]);
        app.log("SEND DATA COMMAND");
        bluetoothSerial.write(COMMAND_DATA, () => {
            document.getElementById("chat").innerHTML = "";
            app.log("Comando enviado");
            buffer = [];
            bluetoothSerial.subscribeRawData(app.onReceiveMessageData, app.onError);
        }, app.onError);
    },
    // Recibir data (Como un array buffer)
    onReceiveMessageData: function (buffer_in) {

        //Tomo los datos del buffer y los paso a un array
        var data = Array.from(new Uint8Array(buffer_in));
        buffer = buffer.concat(data);


        app.log("Recibi data pa " + buffer[buffer.length - 1]);
        app.log("comparo con " + CARACTER_END_DATA);
        app.log(buffer)

        //Compruebo de que si el ultimo caracter un FF, se termina la trasmision
        if (buffer[buffer.length - 1] == CARACTER_END_DATA) {
            app.log("buffer: " + buffer.toString());
            app.procesarBuffer();
            bluetoothSerial.unsubscribeRawData(() => {
                app.log("DATA RECIBIDA");
            }, app.onError);
        }
        /*
        for (var i in data)
            document.getElementById("chat").innerHTML = document.getElementById("chat").innerHTML + " " + data[i];
        */
    },
    procesarBuffer: function () {
        //var mensaje = String.fromCharCode.apply(String, buffer.slice(0, TAM_HEADER));
        //document.getElementById("chat").innerHTML = "Header: " + mensaje + "\n";
        app.log("Procesar lista de registros");
        var listaRegistros = [];
        var ultReg = false;
        var i = 0;
        while (!ultReg) {
            app.log("Registro " + (i + 1));
            var offset = BYTES_REG * i;
            listaRegistros[i] = {
                "Dia": (buffer[offset++] + 2000) + "/" + buffer[offset++] + "/" + buffer[offset++],
                "Hora": buffer[offset++] + ":" + buffer[offset++],
                "Temp": app.getTemperatura(buffer[offset++], buffer[offset++]),
                "end": buffer[offset++]
            };
            document.getElementById("chat").innerHTML = document.getElementById("chat").innerHTML + JSON.stringify(listaRegistros[i]) + "\n";

            ultReg = (listaRegistros[i].end == CARACTER_END_ROW) ? false : true;
            app.log(ultReg);
            app.log("Ultimo registro " + listaRegistros[i].end);
            app.log("CARACTER_END_ROW " + CARACTER_END_ROW);
            i++;
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

