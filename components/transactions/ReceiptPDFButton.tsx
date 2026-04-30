"use client";

import React from "react";
import { format } from "date-fns";
import {
    Document,
    Page,
    Text,
    View,
    StyleSheet,
    PDFDownloadLink,
    Image,
    Font,
} from "@react-pdf/renderer";
import { FileText } from "lucide-react";
import { Button } from "@/components/ui/button";

// Optional: Register fonts if you want them to look better, else use default Helvetica
// Font.register({
//     family: 'Inter',
//     src: 'https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfMZhrib2Bg-4.ttf'
// });

// Create styles for the PDF
const styles = StyleSheet.create({
    page: {
        padding: 40,
        fontFamily: "Helvetica",
        backgroundColor: "#ffffff",
    },
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
        marginBottom: 30,
        borderBottomWidth: 1,
        borderBottomColor: "#e2e8f0",
        paddingBottom: 20,
    },
    clubInfo: {
        flexDirection: "column",
    },
    title: {
        fontSize: 24,
        fontWeight: "bold",
        color: "#1e293b",
        marginBottom: 4,
    },
    subtitle: {
        fontSize: 10,
        color: "#64748b",
    },
    receiptBadge: {
        backgroundColor: "#f1f5f9",
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 4,
        fontSize: 14,
        fontWeight: "bold",
        color: "#334155",
    },
    row: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 12,
    },
    col: {
        flexDirection: "column",
    },
    label: {
        fontSize: 10,
        color: "#64748b",
        textTransform: "uppercase",
        marginBottom: 4,
    },
    value: {
        fontSize: 12,
        color: "#0f172a",
    },
    amountBox: {
        backgroundColor: "#f8fafc",
        padding: 20,
        borderRadius: 8,
        marginTop: 20,
        marginBottom: 30,
        borderWidth: 1,
        borderColor: "#e2e8f0",
    },
    amountRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    amountLabel: {
        fontSize: 14,
        color: "#334155",
        fontWeight: "bold",
    },
    amountValue: {
        fontSize: 24,
        color: "#0f172a",
        fontWeight: "bold",
    },
    footer: {
        marginTop: "auto",
        paddingTop: 40,
    },
    signatures: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginTop: 60,
    },
    signatureLine: {
        width: 200,
        borderTopWidth: 1,
        borderTopColor: "#94a3b8",
        paddingTop: 8,
        textAlign: "center",
    },
    signatureText: {
        fontSize: 10,
        color: "#64748b",
    },
});

const ReceiptDocument = ({ transaction }: { transaction: any }) => {
    const isIncome = transaction.flow === "income";
    const receiptTitle = isIncome ? "RECIBO DE INGRESO" : "COMPROBANTE DE EGRESO";
    const amountGs = `Gs. ${new Intl.NumberFormat("es-PY").format(transaction.monto)}`;
    const dateFormatted = format(new Date(transaction.fecha + 'T12:00:00'), "dd/MM/yyyy");

    return (
        <Document>
            <Page size="A4" style={styles.page}>
                {/* Header */}
                <View style={styles.header}>
                    <View style={styles.clubInfo}>
                        <Text style={styles.title}>Club Deportivo Naranjal</Text>
                        <Text style={styles.subtitle}>Gestión Financiera Integral</Text>
                    </View>
                    <View style={styles.receiptBadge}>
                        <Text>{receiptTitle}</Text>
                        <Text style={{ fontSize: 10, marginTop: 4, color: "#64748b", textAlign: "right" }}>
                            Nº {transaction.comprobante_numero || transaction.id.split('-')[0].toUpperCase()}
                        </Text>
                    </View>
                </View>

                {/* Info Grid */}
                <View style={styles.row}>
                    <View style={styles.col}>
                        <Text style={styles.label}>Fecha</Text>
                        <Text style={styles.value}>{dateFormatted}</Text>
                    </View>
                    <View style={styles.col}>
                        <Text style={styles.label}>Estado</Text>
                        <Text style={styles.value}>
                            {transaction.status === "confirmed" ? "CONFIRMADO" : "ANULADO"}
                        </Text>
                    </View>
                    <View style={styles.col}>
                        <Text style={styles.label}>Fondo</Text>
                        <Text style={styles.value}>
                            {transaction.fondo === "deportivo" ? "Deportivo" : "Administrativo"}
                        </Text>
                    </View>
                </View>

                <View style={{ marginBottom: 20 }} />

                <View style={styles.row}>
                    <View style={[styles.col, { flex: 1 }]}>
                        <Text style={styles.label}>Entidad / Razón Social</Text>
                        <Text style={styles.value}>
                            {transaction.entidades?.nombre || transaction.descripcion || "Sin Razón Social"}
                        </Text>
                    </View>
                    <View style={[styles.col, { flex: 1 }]}>
                        <Text style={styles.label}>Categoría Financiera</Text>
                        <Text style={styles.value}>{transaction.transaction_types?.nombre || "-"}</Text>
                    </View>
                </View>

                <View style={styles.row}>
                    <View style={[styles.col, { flex: 1 }]}>
                        <Text style={styles.label}>Cuenta Bancaria / Caja</Text>
                        <Text style={styles.value}>{transaction.cuentas?.nombre || "-"}</Text>
                    </View>
                    {transaction.evento_id && transaction.eventos && (
                        <View style={[styles.col, { flex: 1 }]}>
                            <Text style={styles.label}>Evento Relacionado</Text>
                            <Text style={styles.value}>
                                {transaction.eventos.tipo} vs {transaction.eventos.rival || "ND"}
                            </Text>
                        </View>
                    )}
                </View>

                {transaction.cantidad && (
                    <View style={styles.row}>
                        <View style={[styles.col, { flex: 1 }]}>
                            <Text style={styles.label}>Cantidad / Unidades</Text>
                            <Text style={styles.value}>{transaction.cantidad}</Text>
                        </View>
                    </View>
                )}

                {/* Amount Box */}
                <View style={styles.amountBox}>
                    <View style={styles.amountRow}>
                        <Text style={styles.amountLabel}>MONTO TOTAL</Text>
                        <Text style={styles.amountValue}>{amountGs}</Text>
                    </View>
                </View>

                <View style={styles.col}>
                    <Text style={styles.label}>Concepto / Descripción</Text>
                    <Text style={styles.value}>{transaction.descripcion || "-"}</Text>
                </View>

                {/* Footer Signatures */}
                <View style={styles.footer}>
                    <View style={styles.signatures}>
                        <View style={styles.col}>
                            <View style={styles.signatureLine}>
                                <Text style={styles.signatureText}>Firma Entregador / Tesorero</Text>
                            </View>
                        </View>
                        <View style={styles.col}>
                            <View style={styles.signatureLine}>
                                <Text style={styles.signatureText}>Firma Receptor / Conforme</Text>
                            </View>
                        </View>
                    </View>
                </View>
            </Page>
        </Document>
    );
};

export function ReceiptPDFButton({ transaction }: { transaction: any }) {
    // Para evitar warnings en hydration (React-PDF a veces tiene problemas de renderizado en server)
    const [isClient, setIsClient] = React.useState(false);

    React.useEffect(() => {
        setIsClient(true);
    }, []);

    if (!isClient) {
        return (
            <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600 opacity-50 cursor-not-allowed">
                <FileText className="h-4 w-4" />
            </Button>
        );
    }

    const fileName = `recibo_${transaction.id.split('-')[0]}.pdf`;

    return (
        <PDFDownloadLink
            document={<ReceiptDocument transaction={transaction} />}
            fileName={fileName}
        >
            {({ loading }) => (
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-100"
                    title="Descargar PDF"
                    disabled={loading}
                >
                    <FileText className={`h-4 w-4 ${loading ? 'opacity-50' : ''}`} />
                </Button>
            )}
        </PDFDownloadLink>
    );
}
