const express = require("express");
const cors = require("cors");
const app = express();
require('./controllers/paymentSaga');
app.use(cors());
app.use(express.json());

app.post("/api/v1/pricing/calculate", (req, res) => {
    const { serviceType, distanceKm, surgeFactor = 1.0 } = req.body;
    const basePrices = { bike: 5000, car: 12000, luxury: 20000 };
    const basePricePerKm = basePrices[serviceType] || 12000;
    const totalPrice = Math.round(basePricePerKm * distanceKm * surgeFactor);

    res.json({
        success: true,
        data: { 
            serviceType, 
            distanceKm, 
            totalPrice, 
            currency: "VND",
            message: "Pricing Service: Đã tính toán thành công!" 
        }
    });
});

const PORT = 3006;
app.listen(PORT, () => {
    console.log(`💰 Pricing Service is running on port ${PORT}`);
});
