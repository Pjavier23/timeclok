export const translations = {
  en: {
    // Common
    language: 'English',
    home: 'Home',
    logout: 'Logout',
    back: 'Back',
    next: 'Next',
    save: 'Save',
    cancel: 'Cancel',
    loading: 'Loading...',
    
    // Auth
    email: 'Email',
    password: 'Password',
    confirmPassword: 'Confirm Password',
    login: 'Login',
    signup: 'Sign Up',
    forgotPassword: 'Forgot Password?',
    
    // Company
    companyName: 'Company Name',
    registerCompany: 'Register Your Company',
    companyRegistration: 'Company Setup',
    addCompany: 'Add Company',
    
    // Employee
    employeeName: 'Employee Name',
    address: 'Address',
    itin: 'ITIN',
    startDate: 'Start Date',
    hourlyRate: 'Hourly Rate ($)',
    profilePhoto: 'Profile Photo',
    uploadPhoto: 'Upload Photo',
    myProfile: 'My Profile',
    employee: 'Employee',
    
    // Time Tracking
    clockIn: 'Clock In',
    clockOut: 'Clock Out',
    clockedIn: 'Clocked In',
    clockedOut: 'Clocked Out',
    totalHours: 'Total Hours',
    runningTime: 'Running Time',
    timeEntries: 'Time Entries',
    
    // Payroll
    payroll: 'Payroll',
    totalEarnings: 'Total Earnings',
    ratePerHour: 'Hourly Rate',
    paymentMethod: 'Payment Method',
    zelle: 'Zelle',
    check: 'Check',
    directDeposit: 'Direct Deposit',
    bankAccount: 'Bank Account',
    
    // Dashboard
    ownerDashboard: 'Owner Dashboard',
    employeeDashboard: 'Employee Dashboard',
    activeEmployees: 'Active Employees',
    weeklyPayroll: 'Weekly Payroll',
    pendingApprovals: 'Pending Approvals',
    
    // Invitations
    inviteEmployee: 'Invite Employee',
    inviteEmail: 'Invite Email',
    sendInvite: 'Send Invite',
    
    // Pricing
    unlimited: 'Unlimited',
    users: 'Users',
    perMonth: 'per month',
  },
  es: {
    // Common
    language: 'Español',
    home: 'Inicio',
    logout: 'Cerrar sesión',
    back: 'Atrás',
    next: 'Siguiente',
    save: 'Guardar',
    cancel: 'Cancelar',
    loading: 'Cargando...',
    
    // Auth
    email: 'Correo electrónico',
    password: 'Contraseña',
    confirmPassword: 'Confirmar Contraseña',
    login: 'Iniciar sesión',
    signup: 'Registrarse',
    forgotPassword: '¿Olvidó su contraseña?',
    
    // Company
    companyName: 'Nombre de la Empresa',
    registerCompany: 'Registrar su Empresa',
    companyRegistration: 'Configuración de la Empresa',
    addCompany: 'Agregar Empresa',
    
    // Employee
    employeeName: 'Nombre del Empleado',
    address: 'Dirección',
    itin: 'ITIN',
    startDate: 'Fecha de Inicio',
    hourlyRate: 'Tarifa por Hora ($)',
    profilePhoto: 'Foto de Perfil',
    uploadPhoto: 'Subir Foto',
    myProfile: 'Mi Perfil',
    employee: 'Empleado',
    
    // Time Tracking
    clockIn: 'Marcar Entrada',
    clockOut: 'Marcar Salida',
    clockedIn: 'Entrada Registrada',
    clockedOut: 'Salida Registrada',
    totalHours: 'Horas Totales',
    runningTime: 'Tiempo en Ejecución',
    timeEntries: 'Registros de Tiempo',
    
    // Payroll
    payroll: 'Nómina',
    totalEarnings: 'Ingresos Totales',
    ratePerHour: 'Tarifa por Hora',
    paymentMethod: 'Método de Pago',
    zelle: 'Zelle',
    check: 'Cheque',
    directDeposit: 'Depósito Directo',
    bankAccount: 'Cuenta Bancaria',
    
    // Dashboard
    ownerDashboard: 'Panel del Propietario',
    employeeDashboard: 'Panel del Empleado',
    activeEmployees: 'Empleados Activos',
    weeklyPayroll: 'Nómina Semanal',
    pendingApprovals: 'Aprobaciones Pendientes',
    
    // Invitations
    inviteEmployee: 'Invitar Empleado',
    inviteEmail: 'Correo de Invitación',
    sendInvite: 'Enviar Invitación',
    
    // Pricing
    unlimited: 'Ilimitado',
    users: 'Usuarios',
    perMonth: 'por mes',
  },
}

export type Language = 'en' | 'es'
export type TranslationKey = keyof typeof translations.en

export const getTranslation = (lang: Language, key: TranslationKey): string => {
  return translations[lang]?.[key] || translations.en[key] || key
}
