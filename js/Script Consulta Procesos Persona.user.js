// ==UserScript==
// @name         Script Consulta Procesos Persona
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Automatizacion de cosulta de procesos judiciales
// @author       Mauricio Bedoya
// @match        http://procesos.ramajudicial.gov.co/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    //NOMBRES DE OBJETOS - ESTA SECCIÓN NO SE DEBE MODIFICAR

    var objetoCiudad = "ddlCiudad";
    var objetoEntidadEspecialidad = "ddlEntidadEspecialidad";
    var objetoOpcionConsulta = "rblConsulta";
    var objetoTipoSujeto = "ddlTipoSujeto";
    var objetoTipoPersona = "ddlTipoPersona";
    var objetoNombre = "txtNatural";
    var objetoBotonConsulta = "btnConsultaNom";
    var objetoPanelListaResultados = "pnlListaResultados";
    var objetoTablaListaResultados = "myTable";

    //Tiempo de espera (para buscar nuevos procesos) en segundos
    var tiempo_espera_consulta = 60;
    //Tiempo de espera (entre cada entidad) en segundos
    var tiempo_espera_entidades = 7;

    //0001 - Demandante
    //0002 - Demandado
    var filtroTipoSujeto = "0002";
    //2 - Nombre o razón social
    var filtroOpcionConsulta = "2";

    //Otras variables generales
    var indiceConsultaCiudad = 1;
    var indiceConsultaEntidad;
    var nombre = "";
    var persona = null;
    var personas = null;
    var indicePersona = 0;
    var solicitud = null;
    var procesosPersona = [];
    var respuestas = [];
    var idPersona = null;
    var tipoSujeto;
    var tipoPersona;
    var tipoDocumento;

    //DEFINICIÓN DE FUNCIONES
    function getUrlVars() {
        var vars = {};
        var parts = window.location.href.replace(/[?&]+([^=&]+)=([^&]*)/gi,
                                                 function(m,key,value) {
            vars[key] = value;
        });
        return vars;
    }

    //Consultar Proceso abiertos para una Persona en una Entidad de una Ciudad
    function consultarEstadoEntidad(indiceEntidadCiudad){

        $("#" + objetoEntidadEspecialidad).prop("selectedIndex", indiceEntidadCiudad);
        $("#" + objetoEntidadEspecialidad).trigger('change');

        setTimeout(function(){

            //Opción de Consulta
            $("#" + objetoOpcionConsulta).val(filtroOpcionConsulta);
            $("#" + objetoOpcionConsulta).trigger('change');

            //Demandante
            $("#" + objetoTipoSujeto).val(filtroTipoSujeto);
            $("#" + objetoTipoSujeto).trigger('change');

            //SELECCIÓN DEL TIPO DE PERSONA
            //Natural por defecto
            $("#" + objetoTipoPersona).val(1);
            //Es Jurídica?
            if (tipoPersona.toLowerCase() === "pj"){
                //Juridica
                $("#" + objetoTipoPersona).val(2);
            }
            $("#" + objetoTipoPersona).trigger('change');

            //Establecer el nombre a Buscar
            $("#" + objetoNombre).val(nombre);

            //Activar el botón de Búsqueda
            $("#" + objetoBotonConsulta).removeAttr("disabled");
            $("#" + objetoBotonConsulta).click();

            //Tiempo de espera para obtener los resultados de la búsqueda
            setTimeout(function(){

                console.log("Búsqueda finalizada");
                if($("#"+ objetoPanelListaResultados) && $("#" + objetoPanelListaResultados).css('display') != 'none'){
                    if($('#' + objetoTablaListaResultados + ' tr')){

                        var procesosEncontrados = $('#gvResultadosNum tr').length - 1;
                        console.log("Procesos encontrados " + procesosEncontrados);

                        //Adicionar encabezado si este no existe
                        if($("#trResultadosPersona tr").length == 0){
                            $("#trResultadosPersona").append("<tr>" + $('#gvResultadosNum tr:eq(0)').html() + "</tr>");
                        }


                        //Adicionar registros de resultado
                        $('#gvResultadosNum tr:gt(0)').each(function(){
                            $("#trResultadosPersona").append("<tr>" + $(this).html() + "</tr>");

                            //Proceso
                            var numeroProceso = $(this).find("td").eq(1).find("a").text();

                            //Fecha
                            var fecha = $(this).find("td").eq(2).find("span").text();

                            //Clase
                            var clase = $(this).find("td").eq(3).find("span").text();

                            //Ponenente
                            var ponente = $(this).find("td").eq(4).find("span").text();

                            //Demandante
                            var demandante = "";
                            if($(this).find("td").eq(5).html()){
                                demandante = $(this).find("td").eq(5).html().replace(/<br>/gi, '').trim();
                            }

                            //Demandado
                            var demandado = "";
                            if($(this).find("td").eq(6).html()){
                                demandado = $(this).find("td").eq(6).html().replace(/<br>/gi, '').trim();
                            }

                            var ciudad = $("#" + objetoCiudad +  " option:selected" ).text();

                            var proceso = {
                                "nombresDemandantes": demandante,
                                "nombresDemandandos": demandado,
                                "clase": clase,
                                "ponente": ponente,
                                "ciudad": ciudad,
                                "proceso": numeroProceso,
                                "fechaRadicacion": fecha
                            };

                            procesosPersona.push(proceso);

                            console.log(proceso);
                        });

                        //Remove table rows from results, so they are no added to our table again
                        $("gvResultadosNum").find("tr:gt(0)").remove();
                    }
                }else{
                    console.log("Procesos no encontrados");
                }


                //MOVERSE A LA SIGUIENTE ENTIDAD DE LA CIUDAD

                indiceConsultaEntidad++;
                console.log("Consultando siguiente Entidad " + indiceConsultaEntidad);

                var cantidadEntidadesCiudad = $('#' + objetoEntidadEspecialidad).children('option').length;
                if(indiceConsultaEntidad + 1 < cantidadEntidadesCiudad){
                    consultarEstadoEntidad(indiceConsultaEntidad);
                }else{

                    //MOVERSE A LA SIGUIENTE CIUDAD

                    indiceConsultaCiudad++;
                    console.log("Consultando siguiente Ciudad " + indiceConsultaCiudad);

                    var cantidadCiudades = $('#' + objetoCiudad).children('option').length;
                    $("#divAvance").css('width', indiceConsultaCiudad/cantidadCiudades*100 + '%');
                    $("#divAvance").html(Math.round(indiceConsultaCiudad/cantidadCiudades*100) + '%');

                    if(indiceConsultaCiudad + 1 < cantidadCiudades){
                        window.opener.postMessage({ estado: "ejecutando", id: idPersona, indiceCiudad: indiceConsultaCiudad + 1, cantidadCiudades: cantidadCiudades, persona: persona, procesos: procesosPersona, finalizado: false}, '*');

                        consultarCiudad(indiceConsultaCiudad);
                    }else{
                        console.log("Proceso finalizado totalmente para " + persona.numeroIdentificacion);
                        console.log(new Date());


                        respuestas.push({
                            "tipoIdentificacion": persona.tipoIdentificacion,
                            "numeroIdentificacion": persona.numeroIdentificacion ,
                            "nombres": persona.nombres,
                            "apellidos": persona.apellidos,
                            "razon_social": persona.razon_social,
                            "tipo_persona": persona.tipo_persona,
                            "respuesta": procesosPersona
                        });

                        window.opener.postMessage({ estado: "ejecutando", id: idPersona, indiceCiudad: indiceConsultaCiudad + 1, cantidadCiudades: cantidadCiudades, persona: persona, procesos: procesosPersona, finalizado: true}, '*');

                        $("#mensaje").html(persona.numeroIdentificacion + " finalizado");

                        setTimeout(function(){
                            close();
                        }, 3000);

                    }

                }

            }, tiempo_espera_entidades * 1000);


        }, 500);

    }

    //Consultar los Procesos para una Ciudad
    function consultarCiudad(indiceEntidadCiudad){

        $("#" + objetoCiudad).prop("selectedIndex", indiceConsultaCiudad);
        $("#" + objetoCiudad).trigger('change');

        //Inicializar indice de Entidad
        indiceConsultaEntidad = 1;

        //Esperar que termine la consulta de Entidades por Ciudad
        setTimeout(function(){

            //Si hay Entidades entonces empezar a interar
            if($('#' + objetoEntidadEspecialidad).children('option').length > 1){

                consultarEstadoEntidad(indiceConsultaEntidad);
            }

        }, 3000);
    }

    //Buscar una persona dado el nombre ingresado
    function buscarPersona(){

        console.log("iniciando la búsqueda de persona");

        if(persona.tipo_persona.toLowerCase() == "pn"){
            nombre = persona.nombres + " " + persona.apellidos;
        }else{
            nombre = persona.razon_social;
        }
        $("#mensaje").html("Ejecutando búsqueda para " + nombre);

        var cantidadCiudades = $('#' + objetoCiudad).children('option').length;

        //Si hay Ciudades entonces empezar a interar
        if(cantidadCiudades > 1){
            console.log("iniciando consulta de ciudad");

            $("#divAvance").css('width', indiceConsultaCiudad/cantidadCiudades*100 + '%');
            $("#divAvance").html(Math.round(indiceConsultaCiudad/cantidadCiudades*100) + '%');
            consultarCiudad(indiceConsultaCiudad);
        }
    }

    //INICIO DE EJECUCIÓN DEL SCRIPT
    function iniciar(){

        console.log("inicializado");

        $( "<div id='divConsultando' style='font-size:12px; align:left; text-align:left; width:50%; border: solid 1px blue; padding: 10px; color:blue'><p>Búsqueda automática de Personas Naturales y Jurídicas</p></div>" ).insertBefore( ".titulos" );

        $("#divConsultando").append("<br /><p id='mensaje' style='color:blue'>Esperando por la Persona a procesar</p>");

    }

    window.addEventListener('message', function(event) {

        // IMPORTANT: Check the origin of the data!
        if (~event.origin.indexOf('http://localhost')) {
            // The data has been sent from your site

            // The data sent with postMessage is stored in event.data
            console.log(event.data);

            window.opener.postMessage('received', '*');

            persona = event.data.objeto;
            idPersona = event.data.indice;
            tipoSujeto = event.data.objeto.payload.tipoSujeto;
            tipoPersona = event.data.objeto.payload.tipoPersona;
            tipoDocumento = event.data.objeto.payload.tipoDocumento;

            //Si se envía 1 entonces se cambia a Demandante, de lo contrario se deja en Demandado
            if(tipoSujeto == 1){
                filtroTipoSujeto = "0001";
            }

            if(event.data.indiceCiudad){
                console.log("Se iniciará desde la ciudad " + event.data.indiceCiudad);
                indiceConsultaCiudad = event.data.indiceCiudad;
                procesosPersona = event.data.procesos;
            }

            buscarPersona();

        } else {
            // The data hasn't been sent from your site!
            // Be careful! Do not use it.
            console.log("Datos enviados desde un dominio no permitido");
            
            return;
        }
    });

    iniciar();

})();