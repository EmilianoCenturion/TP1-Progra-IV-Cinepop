import { Service } from '@angular/core';
import { jsPDF } from 'jspdf';
import { toDataURL } from 'qrcode';

// Colores de Cinepop (los mismos de styles.css) en RGB
const FONDO: [number, number, number] = [21, 20, 28];
const SUPERFICIE: [number, number, number] = [42, 40, 51];
const TEXTO: [number, number, number] = [245, 240, 230];
const SECUNDARIO: [number, number, number] = [138, 135, 112];
const DORADO: [number, number, number] = [232, 170, 61];
const VERDE: [number, number, number] = [76, 175, 125];

@Service()
export class PdfEntradas {

    async generar(compra: any, entradas: any[], butacas: any[], candy: any[], funcion: any) {
        // 105 x 160 mm: un poco más alta que una A6 para que entren todas las butacas y el QR
        const doc = new jsPDF({ unit: 'mm', format: [105, 160] });

        const inicio = new Date(funcion.fecha_hora);
        const fecha = inicio.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
        const hora = inicio.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false });
        const edadMinima = funcion.peliculas.clasificacion_edad;

        // Una sola página con todas las entradas y un único QR para toda la compra
        this.fondo(doc, butacas.length === 1 ? 'ENTRADA' : `${butacas.length} ENTRADAS`);

        // Título (puede ocupar 2 líneas si es largo)
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(16);
        doc.setTextColor(...TEXTO);
        const lineasTitulo = doc.splitTextToSize(funcion.peliculas.nombre, 85);
        doc.text(lineasTitulo, 10, 28);

        // Grilla de datos
        let y = 28 + lineasTitulo.length * 6.5 + 2;
        this.dato(doc, 'FECHA', fecha, 10, y);
        this.dato(doc, 'HORA', hora, 55, y);
        y += 13;
        this.dato(doc, 'SALA', funcion.salas.nombre, 10, y);

        // Butacas: "G20, G21, R21 (VIP)"
        let textoButacas = '';

        for (const b of butacas) {
            textoButacas += (textoButacas === '' ? '' : ', ') + b.fila + b.numero;

            if (b.tipo_butaca !== 'Normal') {
                textoButacas += ` (${b.tipo_butaca})`;
            }
        }

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(...SECUNDARIO);
        doc.text('BUTACAS', 55, y);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(...TEXTO);
        const lineasButacas = doc.splitTextToSize(textoButacas, 42);
        doc.text(lineasButacas, 55, y + 5);

        y += 9 + lineasButacas.length * 4.5;
        this.troquel(doc, y);

        await this.qr(doc, compra.codigo, y + 5);

        // Avisos debajo del QR
        let yAviso = y + 66;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);

        if (edadMinima > 0) {
            doc.setTextColor(...DORADO);
            doc.text(`Película +${edadMinima}: los menores deben ir acompañados de un adulto.`, 52.5, yAviso, { align: 'center', maxWidth: 90 });
            yAviso += 5;
        }

        doc.setTextColor(...SECUNDARIO);
        doc.text(candy.length > 0
            ? 'Este QR sirve para el ingreso de todas las entradas y para retirar tu pedido del candy bar.'
            : 'Este QR sirve para el ingreso de todas las entradas de esta compra.', 52.5, yAviso, { align: 'center', maxWidth: 90 });

        this.pie(doc, compra);

        // Página del candy, solo si compró algo. No tiene QR propio: se retira con el mismo QR de la compra
        if (candy.length > 0) {
            doc.addPage();
            this.fondo(doc, 'CANDY BAR');

            doc.setFont('helvetica', 'bold');
            doc.setFontSize(16);
            doc.setTextColor(...TEXTO);
            doc.text('Tu pedido', 10, 28);

            let y = 40;

            for (const item of candy) {
                doc.setFillColor(...SUPERFICIE);
                doc.roundedRect(10, y - 5, 85, 8, 2, 2, 'F');

                doc.setFont('helvetica', 'bold');
                doc.setFontSize(10);
                doc.setTextColor(...DORADO);
                doc.text(`${item.cantidad}x`, 13, y);

                doc.setFont('helvetica', 'normal');
                doc.setTextColor(...TEXTO);
                doc.text(item.producto.nombre, 23, y);

                y += 10;
            }

            doc.setFontSize(8);
            doc.setTextColor(...SECUNDARIO);
            doc.text('Retiralo en el candy bar mostrando el mismo QR de tus entradas.', 10, y + 4, { maxWidth: 85 });

            this.pie(doc, compra);
        }

        doc.save(`cinepop-compra-${compra.id}.pdf`);
    }

    // Fondo oscuro de toda la página + marca y tipo de comprobante
    private fondo(doc: jsPDF, tipo: string) {
        doc.setFillColor(...FONDO);
        doc.rect(0, 0, 105, 160, 'F');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(18);
        doc.setTextColor(...DORADO);
        doc.text('CINEPOP', 10, 14);

        doc.setFontSize(8);
        doc.setTextColor(...SECUNDARIO);
        doc.text(tipo, 95, 14, { align: 'right' });
    }

    // Etiqueta chica arriba y valor grande abajo
    private dato(doc: jsPDF, etiqueta: string, valor: string, x: number, y: number) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(...SECUNDARIO);
        doc.text(etiqueta, x, y);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(...TEXTO);
        doc.text(valor, x, y + 5);
    }

    private etiqueta(doc: jsPDF, texto: string, x: number, y: number, color: [number, number, number]) {
        doc.setFontSize(7);
        const ancho = doc.getTextWidth(texto) + 4;

        doc.setFillColor(...color);
        doc.roundedRect(x, y - 3.8, ancho, 5, 1.2, 1.2, 'F');

        doc.setTextColor(...FONDO);
        doc.text(texto, x + 2, y);
    }

    // Línea punteada con muescas a los costados, como el troquel de una entrada
    private troquel(doc: jsPDF, y: number) {
        doc.setDrawColor(...SECUNDARIO);
        doc.setLineWidth(0.3);
        doc.setLineDashPattern([1.5, 1.5], 0);
        doc.line(8, y, 97, y);
        doc.setLineDashPattern([], 0);

        doc.setFillColor(255, 255, 255);
        doc.circle(0, y, 4, 'F');
        doc.circle(105, y, 4, 'F');
    }

    private async qr(doc: jsPDF, codigo: string, y: number) {
        const imagen = await toDataURL(codigo, { margin: 1, width: 300 });

        // Recuadro blanco de 48 mm centrado: los lectores necesitan fondo claro
        doc.setFillColor(255, 255, 255);
        doc.roundedRect(28.5, y, 48, 48, 3, 3, 'F');
        doc.addImage(imagen, 'PNG', 31, y + 2.5, 43, 43);

        // Código para tipear a mano si no se puede escanear: "K7M3-9QX2"
        doc.setFont('courier', 'bold');
        doc.setFontSize(14);
        doc.setTextColor(...TEXTO);
        doc.text(codigo.slice(0, 4) + '-' + codigo.slice(4), 52.5, y + 56, { align: 'center' });
    }

    private pie(doc: jsPDF, compra: any) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(...SECUNDARIO);
        doc.text(`Compra N° ${compra.id} · Total $${compra.total_pagado}`, 52.5, 155, { align: 'center' });
    }
}