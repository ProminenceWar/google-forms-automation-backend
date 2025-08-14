const mockFormData = {
    basic: {
        name: "Juan Pérez",
        email: "juan.perez@example.com",
        phone: "+52 55 1234 5678",
        message: "Este es un mensaje de prueba desde la aplicación móvil"
    },

    detailed: {
        firstName: "Ana",
        lastName: "García",
        email: "ana.garcia@test.com",
        phone: "+52 33 9876 5432",
        age: "28",
        city: "Guadalajara",
        occupation: "Desarrolladora",
        comments: "Formulario enviado automáticamente desde React Native",
        rating: "5",
        newsletter: true,
        interests: ["Tecnología", "Programación", "Diseño"]
    },

    survey: {
        participantName: "Carlos Rodríguez",
        email: "carlos.rodriguez@demo.com",
        satisfaction: "Muy satisfecho",
        recommendation: "10",
        feedback: "Excelente servicio, muy recomendable para automatización de formularios",
        improvements: "Sería útil tener más opciones de personalización",
        wouldUseAgain: "Sí, definitivamente"
    },

    contact: {
        fullName: "María Elena Sánchez",
        businessEmail: "maria.sanchez@company.com",
        company: "Tech Solutions MX",
        position: "Product Manager",
        phone: "+52 81 5555 1234",
        subject: "Consulta sobre automatización",
        inquiry: "Me interesa conocer más sobre sus servicios de automatización de formularios para nuestra empresa"
    }
};

const getRandomMockData = () => {
    const types = Object.keys(mockFormData);
    const randomType = types[Math.floor(Math.random() * types.length)];
    return {
        type: randomType,
        data: mockFormData[randomType]
    };
};

const getAllMockData = () => {
    return mockFormData;
};

module.exports = {
    mockFormData,
    getRandomMockData,
    getAllMockData
};