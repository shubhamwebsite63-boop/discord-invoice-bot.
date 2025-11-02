const PDFDocument = require("pdfkit");
const fs = require("fs");

function generateInvoice(data) {
  const doc = new PDFDocument();
  const fileName = `invoice_${Date.now()}.pdf`;
  const stream = fs.createWriteStream(fileName);
  doc.pipe(stream);

  doc.fontSize(22).text("MISCHIEF BAZAAR", { align: "center" });
  doc.moveDown();

  doc.fontSize(12).text(`Invoice No: ${data.invoiceNo}`);
  doc.text(`Customer Name: ${data.customer}`);
  doc.text(`Amount: ₹${data.amount}`);
  doc.text(`Date: ${data.date}`);
  doc.moveDown();

  doc.text("Thank you for shopping with us!", { align: "center" });
  doc.end();

  return new Promise((resolve) => {
    stream.on("finish", () => resolve(fileName));
  });
}

module.exports = generateInvoice;
