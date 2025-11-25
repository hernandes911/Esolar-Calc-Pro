
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Client, monthNames, MonthlyData, initialMonthlyData, ConnectionType, ProjectStatus, PaymentMethod, LaborType, DiscountType, MaterialItem } from '../types';
import { getClientById, saveClient, createEmptyClient } from '../services/clientService';
import { fetchAddressByCep } from '../services/cepService';
import { fetchSolarIrradiation } from '../services/irradiationService';
import { formatPhone, formatCPF } from '../services/authService';
import { getSettings } from '../services/settingsService';
import { InputGroup } from '../components/InputGroup';
import { calculateSolarSystem, formatNumber, formatCurrency } from '../utils/calculations';
import { ResultsCard } from '../components/ResultsCard';
import { ConsumptionChart } from '../components/ConsumptionChart';
import { Toast } from '../components/Toast';
import { 
    ArrowLeft, ArrowRight, Save, FileDown, Zap, Sun, User, BarChart3, 
    MapPin, Loader2, DollarSign, PiggyBank, TrendingUp, CheckCircle, 
    Clock, FileText, Settings, Hammer, Flag, Calendar, CreditCard, Tag, Package, DownloadCloud, Trash2, Plus,
    MessageCircle, Mail, Share2
} from 'lucide-react';
import { jsPDF } from "jspdf";
import autoTable from 'jspdf-autotable';
import { v4 as uuidv4 } from 'uuid';

// Internal Component for Currency Input
const MoneyInput: React.FC<{
  label: string;
  value: number;
  onChange: (val: number) => void;
  placeholder?: string;
  disabled?: boolean;
}> = ({ label, value, onChange, placeholder, disabled }) => {
  const [displayValue, setDisplayValue] = useState('');

  useEffect(() => {
    // Format initial value or external updates
    const val = value || 0;
    setDisplayValue(val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, ''); // Keep only digits
    const numberVal = parseFloat(raw) / 100;
    onChange(numberVal);
  };

  return (
    <div className="flex flex-col">
      <label className="mb-1 text-sm font-medium text-gray-700">{label}</label>
      <div className="relative">
        <span className="absolute left-3 top-2 text-gray-500 text-sm">R$</span>
        <input
          type="text"
          disabled={disabled}
          className="w-full rounded-lg border border-gray-300 bg-white pl-9 pr-3 py-2 text-sm shadow-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 disabled:bg-gray-100 disabled:text-gray-500"
          value={displayValue}
          onChange={handleChange}
          placeholder={placeholder || '0,00'}
        />
      </div>
    </div>
  );
};

const ClientEditor: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [client, setClient] = useState<Client | null>(null);
  const [activeTab, setActiveTab] = useState<'info' | 'consumption' | 'irradiation' | 'results' | 'status'>('info');
  const [isLoadingCep, setIsLoadingCep] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [showToast, setShowToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    if (id) {
      const existing = getClientById(id);
      if (existing) {
        // Ensure status exists for older records
        if (!existing.status) {
            existing.status = 'lead';
            existing.statusUpdatedAt = existing.updatedAt;
        }
        // Ensure new financial fields exist for older records
        if (!existing.laborType) existing.laborType = 'fixed';
        if (existing.laborPercent === undefined) existing.laborPercent = 20;
        if (existing.extraMaterials === undefined) existing.extraMaterials = 0;
        if (!existing.discountType) existing.discountType = 'fixed';
        if (existing.discountPercent === undefined) existing.discountPercent = 0;
        if (!existing.notes) existing.notes = '';
        if (!existing.cpf) existing.cpf = '';
        
        // Migration for materials
        if (!existing.materials) existing.materials = [];
        
        // Check if there is old string data to migrate
        // @ts-ignore - Accessing legacy property
        if (existing.kitItems && existing.kitItems.length > 0 && existing.materials.length === 0) {
            // Create a single item with the legacy text
            // @ts-ignore
            const legacyText = existing.kitItems as string;
            existing.materials.push({
                id: uuidv4(),
                quantity: 1,
                unit: 'kit',
                model: legacyText,
                brand: '-'
            });
        }

        setClient(existing);
      } else {
        // Initialize new if not found (simulating "create mode" via URL)
        const newClient = createEmptyClient();
        newClient.id = id; // Ensure ID matches URL
        setClient(newClient);
      }
    }
  }, [id]);

  // Auto-save logic (debounce could be added for optimization)
  useEffect(() => {
    if (client) {
      // NOTE: We don't block auto-save for validation, but we will block "Final Save" and "Next"
      // saveClient(client); 
      // Manual save preferred for validation check, or silent save.
      // Keeping silent save for data safety, but validation on actions.
      saveClient(client);
    }
  }, [client]);

  // Sync Proposal Value with Total Investment automatically & Calculate Final Value
  const results = client ? calculateSolarSystem(client) : null;
  
  useEffect(() => {
    if (client && results) {
        let needsUpdate = false;
        let updatedClient = { ...client };

        // 1. Sync Proposal Value to Total Investment if it's a new calc or default
        const calculatedInvestment = results.financials.totalInvestment;
        if (updatedClient.proposalValue !== calculatedInvestment) {
             updatedClient.proposalValue = calculatedInvestment;
             needsUpdate = true;
        }

        // 2. Recalculate Final Value based on Discount Type
        let discountAmount = 0;
        if (updatedClient.discountType === 'percent') {
            discountAmount = updatedClient.proposalValue * ((updatedClient.discountPercent || 0) / 100);
        } else {
            discountAmount = updatedClient.discount || 0;
        }

        const newFinalValue = Math.max(0, updatedClient.proposalValue - discountAmount);

        if (updatedClient.finalValue !== newFinalValue) {
            updatedClient.finalValue = newFinalValue;
            needsUpdate = true;
        }

        if (needsUpdate) {
             setClient(updatedClient);
        }
    }
  }, [
      results?.financials.totalInvestment, 
      client?.discountType, 
      client?.discount, 
      client?.discountPercent
  ]);

  if (!client || !results) return <div className="p-10 text-center">Carregando...</div>;

  const validateFields = () => {
      if (!client.name.trim()) return "O Nome Completo é obrigatório.";
      if (!client.cpf.trim()) return "O CPF é obrigatório.";
      if (!client.phone.trim()) return "O Telefone é obrigatório.";
      if (!client.email.trim()) return "O E-mail é obrigatório.";
      
      if (!client.address.zip.trim()) return "O CEP é obrigatório.";
      if (!client.address.street.trim()) return "A Rua é obrigatória.";
      if (!client.address.number.trim()) return "O Número é obrigatório.";
      if (!client.address.neighborhood.trim()) return "O Bairro é obrigatório.";
      if (!client.address.city.trim()) return "A Cidade é obrigatória.";
      if (!client.address.state.trim()) return "O Estado é obrigatório.";

      return null;
  };

  const updateClientField = (field: keyof Client, value: any) => {
    setClient(prev => {
        if (!prev) return null;
        return { ...prev, [field]: value };
    });
  };

  const updateAddress = (field: keyof Client['address'], value: string) => {
    setClient(prev => prev ? ({ ...prev, address: { ...prev.address, [field]: value } }) : null);
  };

  const updateStatus = (newStatus: ProjectStatus) => {
    const error = validateFields();
    if (error) {
        setShowToast({ message: `Complete o cadastro: ${error}`, type: 'error' });
        return;
    }
    
    setClient(prev => prev ? ({ 
        ...prev, 
        status: newStatus,
        statusUpdatedAt: new Date().toISOString()
    }) : null);
    setShowToast({ message: 'Status atualizado com sucesso!', type: 'success' });
  };

  // Material Handlers
  const addMaterial = () => {
    const newItem: MaterialItem = {
        id: uuidv4(),
        quantity: 1,
        unit: 'unid',
        model: '',
        brand: ''
    };
    setClient(prev => prev ? ({ ...prev, materials: [...prev.materials, newItem] }) : null);
  };

  const removeMaterial = (id: string) => {
    setClient(prev => prev ? ({ ...prev, materials: prev.materials.filter(m => m.id !== id) }) : null);
  };

  const updateMaterial = (id: string, field: keyof MaterialItem, value: any) => {
    setClient(prev => {
        if (!prev) return null;
        return {
            ...prev,
            materials: prev.materials.map(m => m.id === id ? { ...m, [field]: value } : m)
        };
    });
  };

  const handleSave = () => {
    if (client) {
        const error = validateFields();
        if (error) {
            setShowToast({ message: error, type: 'error' });
            // We still save draft, but warn user
            saveClient(client);
            return;
        }

        saveClient(client);
        setShowToast({ message: 'Cliente salvo com sucesso!', type: 'success' });
    }
  };

  const handleNextTab = (nextTab: typeof activeTab) => {
      if (activeTab === 'info') {
          const error = validateFields();
          if (error) {
              setShowToast({ message: error, type: 'error' });
              return;
          }
      }
      setActiveTab(nextTab);
  };

  const handleCepChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const newCep = e.target.value;
    updateAddress('zip', newCep);

    // Remove non-digits to check length
    const cleanCep = newCep.replace(/\D/g, '');

    if (cleanCep.length === 8) {
      setIsLoadingCep(true);
      const addressData = await fetchAddressByCep(cleanCep);
      setIsLoadingCep(false);

      if (addressData) {
        setClient(prev => prev ? ({
          ...prev,
          address: {
            ...prev.address,
            street: addressData.logradouro,
            neighborhood: addressData.bairro,
            city: addressData.localidade,
            state: addressData.uf,
            zip: newCep // Keep user input format
          }
        }) : null);
      }
    }
  };

  const handleAutoIrradiation = () => {
    if (!navigator.geolocation) {
      alert("Geolocalização não é suportada pelo seu navegador.");
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          const data = await fetchSolarIrradiation(latitude, longitude);
          
          if (data) {
            setClient(prev => prev ? ({
              ...prev,
              irradiation: data
            }) : null);
            alert("Dados de irradiação atualizados com sucesso (Base NASA POWER).");
          } else {
            alert("Não foi possível obter os dados de irradiação para esta localização.");
          }
        } catch (error) {
          console.error(error);
          alert("Erro ao buscar dados de irradiação.");
        } finally {
          setIsLocating(false);
        }
      },
      (error) => {
        console.error(error);
        setIsLocating(false);
        let msg = "Erro ao obter localização.";
        if (error.code === 1) msg = "Permissão de localização negada.";
        if (error.code === 2) msg = "Localização indisponível.";
        if (error.code === 3) msg = "Tempo limite esgotado.";
        alert(msg);
      }
    );
  };

  const updateMonthlyData = (type: 'consumption' | 'irradiation', month: keyof MonthlyData, value: string) => {
    const numValue = parseFloat(value) || 0;
    setClient(prev => prev ? ({
      ...prev,
      [type]: { ...prev[type], [month]: numValue }
    }) : null);
  };

  // Mock function to simulate Solfacil integration
  const importSolfacilMock = () => {
    setShowToast({ message: 'Buscando dados...', type: 'success' });
    setTimeout(() => {
        const mockKitPrice = 12500.00;
        const mockMaterials: MaterialItem[] = [
            { id: uuidv4(), quantity: 1, unit: 'unid', model: 'Inversor Growatt 5kW', brand: 'Growatt' },
            { id: uuidv4(), quantity: 8, unit: 'unid', model: 'Painéis Solares 550W', brand: 'Jinko' },
            { id: uuidv4(), quantity: 1, unit: 'kit', model: 'Estrutura de Fixação Telhado Cerâmico', brand: 'SolarGroup' },
            { id: uuidv4(), quantity: 1, unit: 'unid', model: 'String Box CC', brand: 'Clamper' },
            { id: uuidv4(), quantity: 40, unit: 'm', model: 'Cabo Solar 6mm Preto', brand: 'Conduspar' },
            { id: uuidv4(), quantity: 40, unit: 'm', model: 'Cabo Solar 6mm Vermelho', brand: 'Conduspar' },
            { id: uuidv4(), quantity: 4, unit: 'par', model: 'Conectores MC4', brand: 'Staubli' },
        ];
        
        setClient(prev => {
            if (!prev) return null;
            return {
                ...prev,
                kitPrice: mockKitPrice,
                materials: mockMaterials
            };
        });
        setShowToast({ message: 'Dados importados com sucesso! (Simulação)', type: 'success' });
    }, 1500);
  };

  const generatePDF = () => {
    const error = validateFields();
    if (error) {
        setShowToast({ message: `Não é possível gerar o PDF. ${error}`, type: 'error' });
        return;
    }

    // Use any to bypass TypeScript errors with jspdf-autotable extensions
    const doc: any = new jsPDF();
    const settings = getSettings();
    
    // --- COLORS ---
    // Yellow-500 (Vibrant Yellow/Gold) - Adjusted to Request
    const PRIMARY_COLOR: [number, number, number] = [234, 179, 8]; 
    const PRIMARY_COLOR_HEX = '#eab308';

    // --- EXPIRATION DATE ---
    const creationDate = new Date();
    const expirationDate = new Date();
    expirationDate.setDate(creationDate.getDate() + 30);

    // --- LOGO GENERATION ---
    if (settings.logo) {
      // Use Custom Logo
      try {
        doc.addImage(settings.logo, 'PNG', 14, 10, 24, 24, undefined, 'FAST');
      } catch (e) {
        console.error("Error adding logo", e);
        doc.setFontSize(8);
        doc.text("Logo", 14, 20);
      }
    } else {
        // Draw Default Sun Body (Canvas)
        const canvas = document.createElement('canvas');
        canvas.width = 120;
        canvas.height = 120;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = PRIMARY_COLOR_HEX; 
          ctx.beginPath();
          ctx.arc(60, 60, 25, 0, Math.PI * 2);
          ctx.fill();
          
          ctx.strokeStyle = PRIMARY_COLOR_HEX;
          ctx.lineWidth = 4;
          for (let i = 0; i < 12; i++) {
            ctx.save();
            ctx.translate(60, 60);
            ctx.rotate((i * Math.PI) / 6);
            ctx.beginPath();
            ctx.moveTo(0, 32);
            ctx.lineTo(0, 42);
            ctx.stroke();
            ctx.restore();
          }
          const logoData = canvas.toDataURL('image/png');
          doc.addImage(logoData, 'PNG', 14, 10, 24, 24);
        }
    }
    
    // Title
    doc.setFontSize(20);
    doc.setTextColor(PRIMARY_COLOR[0], PRIMARY_COLOR[1], PRIMARY_COLOR[2]); 
    doc.text("Relatório de Dimensionamento Solar", 42, 22);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Gerado em: ${creationDate.toLocaleDateString()} - SolarCalc Pro`, 42, 28);
    // Add Expiration Date
    doc.setTextColor(220, 38, 38); // Red color for expiration
    doc.setFont("helvetica", "bold");
    doc.text(`Validade da Proposta: ${expirationDate.toLocaleDateString()}`, 42, 33);
    doc.setFont("helvetica", "normal");

    // Decorative Line
    doc.setDrawColor(229, 231, 235); // gray-200
    doc.setLineWidth(0.5);
    doc.line(14, 38, 196, 38);

    // Client Info
    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.text(`Cliente: ${client.name}`, 14, 48);
    if (client.cpf) {
        doc.text(`CPF: ${client.cpf}`, 14, 54);
    }
    const addressY = client.cpf ? 60 : 54;
    doc.text(`Endereço: ${client.address.street}, ${client.address.number} - ${client.address.neighborhood}`, 14, addressY);
    doc.text(`${client.address.city} - ${client.address.state}`, 14, addressY + 6);
    
    const startTableY = addressY + 14;

    // System Summary
    const summaryData = [
        ['Potência do Sistema', `${formatNumber(results.totalSystemPowerKWp)} kWp`],
        ['Nº de Painéis', `${results.panelCountRounded} (${client.panelPowerWp}W)`],
        ['Geração Média Mensal', `${formatNumber(results.avgMonthlyGeneration)} kWh`],
        ['Padrão de Conexão', client.connectionType.charAt(0).toUpperCase() + client.connectionType.slice(1)],
        ['Área Estimada', `${formatNumber(results.panelCountRounded * 2.2)} m²`]
    ];

    autoTable(doc, {
        startY: startTableY,
        head: [['Parâmetro', 'Valor']],
        body: summaryData,
        theme: 'grid',
        headStyles: { fillColor: PRIMARY_COLOR }
    });

    // Financial Analysis
    doc.setFontSize(14);
    doc.setTextColor(0);
    doc.text("Análise Financeira e Payback", 14, doc.lastAutoTable.finalY + 15);

    // Construct Financial Data Table
    const financialData = [];
    
    // Proposal Value / Investment
    financialData.push(['Valor da Proposta (Investimento)', formatCurrency(client.proposalValue)]);
    
    // Discount info
    if (client.discount && client.discount > 0) {
       financialData.push(['Desconto Aplicado', `- ${formatCurrency(client.discount)}`]);
    } else if (client.discountPercent && client.discountPercent > 0) {
       const discountVal = client.proposalValue * (client.discountPercent / 100);
       financialData.push([`Desconto Aplicado (${client.discountPercent}%)`, `- ${formatCurrency(discountVal)}`]);
    }

    // Final Value
    financialData.push(['Valor Final', formatCurrency(client.finalValue)]);

    // ROI
    financialData.push(['Economia Média Mensal', formatCurrency(results.financials.monthlySavings)]);
    financialData.push(['Custo Médio Mensal (Sem Solar)', formatCurrency(results.financials.monthlyBillWithoutSolar)]);
    financialData.push(['Payback Estimado', `${formatNumber(results.financials.paybackYears, 1)} anos (${formatNumber(results.financials.paybackMonths, 0)} meses)`]);
    financialData.push(['Economia em 25 Anos', formatCurrency(results.financials.totalSavings25Years)]);

    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 20,
      body: financialData,
      theme: 'plain',
      styles: { fontSize: 11, cellPadding: 3 },
      columnStyles: {
        0: { fontStyle: 'bold', width: 100 },
        1: { halign: 'right' }
      }
    });

    // --- MONTHLY BREAKDOWN (Moved to new page) ---
    doc.addPage();
    doc.setFontSize(14);
    doc.setTextColor(0);
    doc.text("Detalhamento Mensal de Geração", 14, 20);

    const monthlyRows = monthNames.map(m => [
        m.label,
        `${formatNumber(client.consumption[m.key as keyof MonthlyData])} kWh`,
        `${formatNumber(client.irradiation[m.key as keyof MonthlyData])} kWh/m²`,
        `${formatNumber(results.monthlyGeneration[m.key as keyof MonthlyData])} kWh`
    ]);

    autoTable(doc, {
        startY: 25,
        head: [['Mês', 'Consumo', 'Irradiação', 'Geração Est.']],
        body: monthlyRows,
        theme: 'striped',
        headStyles: { fillColor: PRIMARY_COLOR }
    });

    // --- DRAW CHART ---
    let chartY = doc.lastAutoTable.finalY + 15;
    const chartHeight = 60;
    
    // Check page break
    if (chartY + chartHeight + 20 > 280) {
      doc.addPage();
      chartY = 30;
    }

    doc.setFontSize(14);
    doc.setTextColor(0);
    doc.text("Comparativo: Consumo vs. Geração", 14, chartY);
    
    chartY += 10; // Move down for chart area
    const chartX = 14;
    const chartWidth = 180;
    const maxBarHeight = 50;

    // Calculate Max Value for Scale
    let maxVal = 0;
    monthNames.forEach(m => {
      const cons = client.consumption[m.key as keyof MonthlyData] || 0;
      const gen = results.monthlyGeneration[m.key as keyof MonthlyData] || 0;
      if (cons > maxVal) maxVal = cons;
      if (gen > maxVal) maxVal = gen;
    });
    maxVal = maxVal * 1.1 || 100; // Buffer or default

    // Draw Axes
    doc.setDrawColor(200, 200, 200);
    doc.line(chartX, chartY + maxBarHeight, chartX + chartWidth, chartY + maxBarHeight); // X Axis

    // Draw Bars
    const barWidth = (chartWidth / 12) / 2.5;
    const groupWidth = chartWidth / 12;

    monthNames.forEach((m, i) => {
      const cons = client.consumption[m.key as keyof MonthlyData] || 0;
      const gen = results.monthlyGeneration[m.key as keyof MonthlyData] || 0;
      
      const hCons = (cons / maxVal) * maxBarHeight;
      const hGen = (gen / maxVal) * maxBarHeight;

      const xGroup = chartX + (i * groupWidth) + (groupWidth/2);

      // Consumo (Red)
      doc.setFillColor(239, 68, 68);
      doc.rect(xGroup - barWidth, chartY + maxBarHeight - hCons, barWidth, hCons, 'F');

      // Geração (Green)
      doc.setFillColor(34, 197, 94);
      doc.rect(xGroup, chartY + maxBarHeight - hGen, barWidth, hGen, 'F');
      
      // Label
      doc.setFontSize(8);
      doc.setTextColor(100);
      doc.text(m.label.substring(0,3), xGroup, chartY + maxBarHeight + 4, { align: 'center' });
    });

    // Legend
    const legendY = chartY + maxBarHeight + 12;
    doc.setFillColor(239, 68, 68);
    doc.rect(chartX, legendY, 4, 4, 'F');
    doc.setFontSize(10);
    doc.setTextColor(80);
    doc.text("Consumo", chartX + 6, legendY + 3);

    doc.setFillColor(34, 197, 94);
    doc.rect(chartX + 40, legendY, 4, 4, 'F');
    doc.text("Geração", chartX + 46, legendY + 3);

    // --- EQUIPMENT LIST AS TABLE ---
    // Updated to use structured MaterialItem data
    const materialBody = client.materials.map(item => [
        item.quantity.toString(),
        item.unit,
        item.model,
        item.brand
    ]);

    // Force page break before Materials List so it doesn't get cut off
    doc.addPage();
    let materialStartY = 30;

    // Always create a table for materials if there are items
    if (client.materials.length > 0) {
       doc.setFontSize(14);
       doc.setTextColor(0);
       doc.text("Lista de Equipamentos / Materiais", 14, materialStartY);
       
       autoTable(doc, {
          startY: materialStartY + 5,
          head: [['Qtd', 'Unid', 'Modelo / Descrição', 'Marca']],
          body: materialBody,
          theme: 'grid',
          headStyles: {
              fillColor: PRIMARY_COLOR,
              halign: 'left',
              valign: 'middle',
              fontSize: 10,
              fontStyle: 'bold'
          },
          bodyStyles: {
              halign: 'left',
              valign: 'middle',
              fontSize: 9,
              cellPadding: 3
          },
          columnStyles: {
              0: { halign: 'center', width: 20 },
              1: { halign: 'center', width: 20 },
              3: { width: 40 }
          }
       });
    } else {
        doc.setFontSize(14);
        doc.setTextColor(0);
        doc.text("Lista de Equipamentos / Materiais", 14, materialStartY);
        doc.setFontSize(12);
        doc.setTextColor(100);
        doc.text("Nenhum material listado.", 14, materialStartY + 10);
    }
    
    // --- ACCEPTANCE TERM / SIGNATURE ---
    doc.addPage(); // Force new page for Term of Acceptance

    const pageHeight = doc.internal.pageSize.getHeight();
    const pageWidth = doc.internal.pageSize.getWidth();
    let currentY = 20;
    const margin = 20;
    const contentWidth = pageWidth - (2 * margin);

    // Title
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0);
    doc.text("TERMO DE ACEITE DA PROPOSTA TÉCNICO-COMERCIAL", pageWidth / 2, currentY, { align: 'center' });
    currentY += 15;

    // Body
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    
    doc.text("À Esolar Soluções Elétricas.", margin, currentY);
    currentY += 10;
    
    const bodyText = "Manifesto aceite na proposta supracitada, nos valores, quantidades e condições de pagamento constantes na Proposta Comercial em anexo.";
    const splitBody = doc.splitTextToSize(bodyText, contentWidth);
    doc.text(splitBody, margin, currentY);
    currentY += 20;

    // Fields
    doc.text("Data: _____ / _____ / ________", margin, currentY);
    currentY += 10;
    
    doc.text(`Nome: ${client.name.toUpperCase()}`, margin, currentY);
    currentY += 10;
    
    doc.text(`CPF: ${client.cpf || '_____________________'}`, margin, currentY);
    currentY += 25;

    // Signature Line
    doc.line(margin, currentY, pageWidth - margin, currentY);
    doc.text("Assinatura", margin, currentY + 5);
    currentY += 15;

    // Legal Disclaimers (Smaller font)
    doc.setFontSize(9);
    doc.setTextColor(80); // Dark Gray

    const disclaimer1 = "Considerando que o aceite firmado nesta proposta, seja de forma on-line na Plataforma Solar ou de forma física, em via impressa, vinculará as partes às condições e obrigações ali estabelecidas em relação contratual válida e irrevogável, não podendo as partes ceder ou transferir esta proposta ou quaisquer benefícios, interesses, direitos ou obrigações dela decorrentes, no todo ou em parte, a qualquer terceiro, sem o consentimento prévio por escrito da outra parte.";
    const splitDisc1 = doc.splitTextToSize(disclaimer1, contentWidth);
    doc.text(splitDisc1, margin, currentY, { align: 'justify', maxWidth: contentWidth });
    currentY += doc.getTextDimensions(splitDisc1).h + 5;

    const disclaimer2 = "A validade das condições desta proposta depende da disponibilidade de estoque e confirmação de pagamento ou assinatura do respectivo contrato de prestação de serviço fotovoltaico.";
    const splitDisc2 = doc.splitTextToSize(disclaimer2, contentWidth);
    doc.text(splitDisc2, margin, currentY, { align: 'justify', maxWidth: contentWidth });


    doc.save(`SolarCalc_${client.name.replace(/\s+/g, '_')}.pdf`);
  };

  // --- STATUS LOGIC ---
  const timelineSteps: { id: ProjectStatus, label: string, icon: React.ReactNode, description: string }[] = [
    { id: 'lead', label: 'Novo / Análise', icon: <FileText size={20} />, description: 'Cliente cadastrado, coletando dados.' },
    { id: 'proposal_sent', label: 'Proposta Enviada', icon: <FileDown size={20} />, description: 'Proposta apresentada ao cliente.' },
    { id: 'proposal_accepted', label: 'Proposta Aceita', icon: <CheckCircle size={20} />, description: 'Cliente aceitou, contrato assinado.' },
    { id: 'approval', label: 'Homologação', icon: <Settings size={20} />, description: 'Solicitação de acesso na concessionária.' },
    { id: 'installation', label: 'Instalação', icon: <Hammer size={20} />, description: 'Equipe em campo instalando o sistema.' },
    { id: 'completed', label: 'Concluído', icon: <Flag size={20} />, description: 'Sistema ativo e gerando economia.' },
  ];

  const getStatusIndex = (s: ProjectStatus) => timelineSteps.findIndex(step => step.id === s);
  const currentStatusIndex = getStatusIndex(client.status || 'lead');

  const getFollowUpDate = (dateString: string) => {
    const date = new Date(dateString);
    date.setDate(date.getDate() + 45);
    return date;
  };

  const handleShareWhatsApp = () => {
    if (!client.phone) {
        setShowToast({ message: 'Telefone do cliente não cadastrado.', type: 'error' });
        return;
    }
    
    // Simple cleaning: remove non-digits
    let phone = client.phone.replace(/\D/g, '');
    
    // Add Brazil country code if missing (heuristic: length 10 or 11)
    if (phone.length >= 10 && phone.length <= 11) {
        phone = '55' + phone;
    }

    const message = `Olá ${client.name}, tudo bem? \n\nSegue a proposta de energia solar que preparamos para você. \n\nQualquer dúvida estou à disposição!`;
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  const handleShareEmail = () => {
    if (!client.email) {
        setShowToast({ message: 'E-mail do cliente não cadastrado.', type: 'error' });
        return;
    }
    
    const subject = `Proposta de Energia Solar - ${client.name}`;
    const body = `Olá ${client.name},\n\nConforme conversamos, segue em anexo a proposta de dimensionamento fotovoltaico para sua análise.\n\nFico à disposição para esclarecer qualquer dúvida.\n\nAtenciosamente,\nSolarCalc Pro`;
    
    const url = `mailto:${client.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Toast */}
      {showToast && (
        <Toast 
          message={showToast.message} 
          type={showToast.type} 
          onClose={() => setShowToast(null)} 
        />
      )}

      {/* Top Bar */}
      <div className="sticky top-0 z-10 border-b border-slate-200 bg-white px-4 py-3 shadow-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/')} className="rounded-full p-2 hover:bg-slate-100">
              <ArrowLeft className="text-slate-600" />
            </button>
            <div>
              <h1 className="text-lg font-bold text-slate-800">{client.name || 'Novo Cliente'}</h1>
              <p className="text-xs text-slate-500">ID: {client.id.substring(0,8)}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={handleSave}
              className="flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700"
            >
              <Save size={16} />
              <span className="hidden sm:inline">Salvar</span>
            </button>
            <button 
              onClick={generatePDF}
              className="flex items-center gap-2 rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
            >
              <FileDown size={16} />
              <span className="hidden sm:inline">PDF</span>
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-6">
        {/* Tabs */}
        <div className="mb-6 flex flex-wrap gap-2 overflow-x-auto rounded-xl bg-white p-1 shadow-sm">
          <button 
            onClick={() => handleNextTab('info')}
            className={`flex flex-1 min-w-[120px] items-center justify-center gap-2 whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition ${activeTab === 'info' ? 'bg-amber-100 text-amber-800' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            <User size={16} /> Dados Cliente
          </button>
          <button 
            onClick={() => handleNextTab('consumption')}
            className={`flex flex-1 min-w-[120px] items-center justify-center gap-2 whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition ${activeTab === 'consumption' ? 'bg-amber-100 text-amber-800' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            <Zap size={16} /> Consumo
          </button>
          <button 
            onClick={() => handleNextTab('irradiation')}
            className={`flex flex-1 min-w-[120px] items-center justify-center gap-2 whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition ${activeTab === 'irradiation' ? 'bg-amber-100 text-amber-800' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            <Sun size={16} /> Irradiação
          </button>
          <button 
            onClick={() => handleNextTab('results')}
            className={`flex flex-1 min-w-[120px] items-center justify-center gap-2 whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition ${activeTab === 'results' ? 'bg-amber-100 text-amber-800' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            <BarChart3 size={16} /> Resultados
          </button>
          <button 
            onClick={() => handleNextTab('status')}
            className={`flex flex-1 min-w-[120px] items-center justify-center gap-2 whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition ${activeTab === 'status' ? 'bg-amber-100 text-amber-800' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            <CheckCircle size={16} /> Status
          </button>
        </div>

        {/* Tab Content */}
        <div className="space-y-6">
          {activeTab === 'info' && (
            <div className="rounded-xl bg-white p-6 shadow-sm animate-fade-in">
              <h2 className="mb-4 text-lg font-bold text-slate-800">Informações Pessoais</h2>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <InputGroup label="Nome Completo *" value={client.name} onChange={e => updateClientField('name', e.target.value)} placeholder="Ex: João Silva" />
                <InputGroup 
                    label="CPF *" 
                    value={client.cpf || ''} 
                    onChange={e => updateClientField('cpf', formatCPF(e.target.value))} 
                    placeholder="000.000.000-00"
                    maxLength={14}
                />
                <InputGroup label="Telefone *" value={client.phone} onChange={e => updateClientField('phone', formatPhone(e.target.value))} placeholder="(00) 00000-0000" />
                <InputGroup label="E-mail *" type="email" value={client.email} onChange={e => updateClientField('email', e.target.value)} placeholder="joao@exemplo.com" />
                
                <div className="md:col-span-2">
                    <h3 className="mb-2 mt-4 text-sm font-semibold text-slate-500 uppercase tracking-wider">Endereço</h3>
                </div>
                
                <InputGroup 
                  label="CEP *" 
                  value={client.address.zip} 
                  onChange={handleCepChange} 
                  isLoading={isLoadingCep}
                  placeholder="00000-000"
                  maxLength={9}
                />
                
                <InputGroup label="Rua *" value={client.address.street} onChange={e => updateAddress('street', e.target.value)} />
                <InputGroup label="Número *" value={client.address.number} onChange={e => updateAddress('number', e.target.value)} />
                <InputGroup label="Bairro *" value={client.address.neighborhood} onChange={e => updateAddress('neighborhood', e.target.value)} />
                <InputGroup label="Cidade *" value={client.address.city} onChange={e => updateAddress('city', e.target.value)} />
                <InputGroup label="Estado *" value={client.address.state} onChange={e => updateAddress('state', e.target.value)} />
                
                {/* New Notes Field */}
                <div className="md:col-span-2 mt-2">
                    <label className="mb-1 text-sm font-medium text-gray-700">Observações Adicionais</label>
                    <textarea
                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 min-h-[120px]"
                        value={client.notes || ''}
                        onChange={e => updateClientField('notes', e.target.value)}
                        placeholder="Insira aqui anotações gerais sobre o cliente, preferências ou detalhes do local..."
                    />
                </div>
              </div>
              
              <div className="mt-8 flex items-center justify-end gap-3 border-t border-slate-100 pt-6">
                 <button 
                  onClick={handleSave}
                  className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-700 hover:bg-amber-100"
                >
                  <Save size={16} />
                  Salvar
                </button>
                <button 
                  onClick={() => handleNextTab('consumption')}
                  className="flex items-center gap-2 rounded-lg bg-slate-800 px-6 py-2 text-sm font-medium text-white hover:bg-slate-700 shadow-sm"
                >
                  Próximo
                  <ArrowRight size={16} />
                </button>
              </div>
            </div>
          )}

          {activeTab === 'consumption' && (
            <div className="space-y-6">
              {/* Monthly Consumption Grid */}
              <div className="rounded-xl bg-white p-6 shadow-sm animate-fade-in">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-slate-800">Histórico de Consumo (kWh)</h2>
                  <div className="bg-blue-50 text-blue-700 px-3 py-1 rounded-lg text-sm font-semibold">
                      Média: {formatNumber(results.avgMonthlyConsumption)} kWh
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
                  {monthNames.map((m) => (
                    <InputGroup 
                      key={m.key}
                      label={m.label} 
                      type="number"
                      value={client.consumption[m.key as keyof MonthlyData] || ''}
                      onChange={(e) => updateMonthlyData('consumption', m.key as keyof MonthlyData, e.target.value)}
                    />
                  ))}
                </div>
              </div>

              {/* Financial Parameters (New Section) */}
              <div className="rounded-xl bg-white p-6 shadow-sm animate-fade-in">
                <div className="flex items-center gap-2 mb-4 text-slate-800">
                   <DollarSign className="h-5 w-5 text-green-600" />
                   <h2 className="text-lg font-bold">Dados Financeiros para Análise</h2>
                </div>
                
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                   {/* Connection Type Selector */}
                   <div className="flex flex-col">
                      <label className="mb-1 text-sm font-medium text-gray-700">Padrão de Conexão</label>
                      <select 
                        value={client.connectionType} 
                        onChange={(e) => updateClientField('connectionType', e.target.value as ConnectionType)}
                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                      >
                        <option value="monofasico">Monofásico (30 kWh)</option>
                        <option value="bifasico">Bifásico (50 kWh)</option>
                        <option value="trifasico">Trifásico (100 kWh)</option>
                      </select>
                   </div>

                   {/* kWh Price - Keep high precision, standard number input but stepped */}
                   <InputGroup 
                     label="Valor do kWh (R$)" 
                     type="number" 
                     step="0.0001"
                     value={client.kwhPrice} 
                     onChange={e => updateClientField('kwhPrice', parseFloat(e.target.value))}
                     placeholder="Ex: 0.95"
                   />

                   {/* Kit Price with Mask */}
                   <MoneyInput 
                     label="Valor do Kit (R$)" 
                     value={client.kitPrice}
                     onChange={(val) => updateClientField('kitPrice', val)}
                   />
                   
                   {/* Labor Field with Toggle */}
                   <div className="flex flex-col">
                        <label className="mb-1 text-sm font-medium text-gray-700">Mão de Obra</label>
                        <div className="flex items-center gap-2 mb-2">
                             <div className="flex bg-slate-100 rounded-lg p-1">
                                <button 
                                    onClick={() => updateClientField('laborType', 'fixed')}
                                    className={`px-3 py-1 text-xs font-medium rounded-md transition ${client.laborType === 'fixed' ? 'bg-white shadow text-slate-800' : 'text-slate-500'}`}
                                >
                                    Fixo (R$)
                                </button>
                                <button 
                                    onClick={() => updateClientField('laborType', 'percent')}
                                    className={`px-3 py-1 text-xs font-medium rounded-md transition ${client.laborType === 'percent' ? 'bg-white shadow text-slate-800' : 'text-slate-500'}`}
                                >
                                    % do Kit
                                </button>
                             </div>
                        </div>

                        {client.laborType === 'fixed' ? (
                            <MoneyInput 
                                label=""
                                value={client.laborPrice || 0}
                                onChange={(val) => updateClientField('laborPrice', val)}
                            />
                        ) : (
                            <div>
                                <div className="relative">
                                    <input 
                                        type="number"
                                        step="1"
                                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 pr-8"
                                        value={client.laborPercent || ''}
                                        onChange={e => updateClientField('laborPercent', parseFloat(e.target.value))}
                                        placeholder="%"
                                    />
                                    <span className="absolute right-3 top-2 text-gray-400 text-sm">%</span>
                                </div>
                                <div className="mt-1 text-xs text-slate-500">
                                    Calculado: {formatCurrency(results.financials.calculatedLaborCost)}
                                </div>
                            </div>
                        )}
                   </div>

                   {/* Extra Materials with Mask */}
                   <MoneyInput 
                     label="Materiais Extras" 
                     value={client.extraMaterials || 0}
                     onChange={(val) => updateClientField('extraMaterials', val)}
                   />
                   
                   {/* Read Only Total */}
                   <div className="flex flex-col">
                      <label className="mb-1 text-sm font-medium text-gray-700">Investimento Total (R$)</label>
                      <div className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-bold text-gray-700 shadow-sm">
                        {formatCurrency(results.financials.totalInvestment)}
                      </div>
                      <p className="text-[10px] text-gray-500 mt-1">Kit + Mão de Obra + Extras</p>
                   </div>
                </div>
                
                <div className="mt-8 flex items-center justify-between border-t border-slate-100 pt-6">
                    <button 
                        onClick={() => handleNextTab('info')} 
                        className="flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                    >
                        <ArrowLeft size={16} />
                        Voltar
                    </button>
                    <button 
                        onClick={() => handleNextTab('irradiation')} 
                        className="flex items-center gap-2 rounded-lg bg-slate-800 px-6 py-2 text-sm font-medium text-white hover:bg-slate-700 shadow-sm"
                    >
                        Próximo
                        <ArrowRight size={16} />
                    </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'irradiation' && (
            <div className="rounded-xl bg-white p-6 shadow-sm animate-fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
                 <div>
                   <h2 className="text-lg font-bold text-slate-800">Irradiação Solar (kWh/m²/dia)</h2>
                   <p className="text-xs text-slate-500">Insira manualmente ou busque pela localização.</p>
                 </div>
                 
                 <div className="flex items-center gap-2">
                   <div className="bg-yellow-50 text-yellow-700 px-3 py-2 rounded-lg text-sm font-semibold whitespace-nowrap">
                      Média: {formatNumber(results.avgIrradiation)}
                   </div>
                   <button 
                    onClick={handleAutoIrradiation}
                    disabled={isLocating}
                    className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-70 whitespace-nowrap shadow-sm"
                   >
                    {isLocating ? <Loader2 size={16} className="animate-spin" /> : <MapPin size={16} />}
                    {isLocating ? 'Buscando...' : 'Buscar Localização'}
                   </button>
                 </div>
               </div>
               
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
                {monthNames.map((m) => (
                  <InputGroup 
                    key={m.key}
                    label={m.label} 
                    type="number"
                    step="0.01"
                    // Use onBlur to format to 2 decimal places when user finishes typing
                    onBlur={(e) => {
                        const val = parseFloat(e.target.value);
                        if (!isNaN(val)) {
                            updateMonthlyData('irradiation', m.key as keyof MonthlyData, val.toFixed(2));
                        }
                    }}
                    value={client.irradiation[m.key as keyof MonthlyData] || ''}
                    onChange={(e) => updateMonthlyData('irradiation', m.key as keyof MonthlyData, e.target.value)}
                  />
                ))}
              </div>
              <div className="mt-4 text-right">
                <p className="text-xs text-slate-400">Fonte de dados automáticos: NASA POWER (Global Solar API)</p>
              </div>
              
              <div className="mt-8 flex items-center justify-between border-t border-slate-100 pt-6">
                  <button 
                      onClick={() => handleNextTab('consumption')} 
                      className="flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                      <ArrowLeft size={16} />
                      Voltar
                  </button>
                  <button 
                      onClick={() => handleNextTab('results')} 
                      className="flex items-center gap-2 rounded-lg bg-slate-800 px-6 py-2 text-sm font-medium text-white hover:bg-slate-700 shadow-sm"
                  >
                      Próximo
                      <ArrowRight size={16} />
                  </button>
              </div>
            </div>
          )}

          {activeTab === 'results' && (
            <div className="space-y-6 animate-fade-in">
              {/* Configs */}
              <div className="rounded-xl bg-white p-6 shadow-sm">
                 <h2 className="mb-4 text-lg font-bold text-slate-800">Parâmetros do Sistema</h2>
                 <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <InputGroup 
                        label="Potência do Painel (Watts)" 
                        type="number" 
                        value={client.panelPowerWp} 
                        onChange={e => updateClientField('panelPowerWp', parseFloat(e.target.value))} 
                    />
                    <InputGroup 
                        label="Rendimento do Sistema (0.75 = 75%)" 
                        type="number" 
                        step="0.01"
                        value={client.systemEfficiency} 
                        onChange={e => updateClientField('systemEfficiency', parseFloat(e.target.value))} 
                    />
                 </div>
              </div>

              <ResultsCard results={results} />

              {/* Financial Analysis Card (New) */}
              <div className="rounded-xl bg-white shadow-sm overflow-hidden">
                <div className="border-b border-slate-100 bg-slate-50 px-6 py-4 flex items-center gap-2">
                   <PiggyBank className="h-5 w-5 text-emerald-600" />
                   <h3 className="font-bold text-slate-700">Análise de Retorno (Payback)</h3>
                </div>
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div className="p-4 bg-slate-50 rounded-lg">
                        <p className="text-sm text-slate-500 mb-1">Custo Médio Mensal (Sem Solar)</p>
                        <p className="text-xl font-bold text-slate-700">{formatCurrency(results.financials.monthlyBillWithoutSolar)}</p>
                    </div>
                    <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-100">
                        <p className="text-sm text-emerald-700 mb-1">Novo Custo Médio (Com Solar)</p>
                        <p className="text-xl font-bold text-emerald-700">{formatCurrency(results.financials.monthlyBillWithSolar)}</p>
                        <div className="flex justify-between items-center mt-1">
                           <p className="text-xs text-emerald-600">Economia Média: {formatCurrency(results.financials.monthlySavings)}/mês</p>
                           <span className="text-[10px] px-1.5 py-0.5 bg-white rounded text-emerald-600 border border-emerald-200">
                             Min: {formatCurrency(results.financials.minimumBillCost)}
                           </span>
                        </div>
                    </div>
                    <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
                        <p className="text-sm text-blue-700 mb-1">Tempo de Retorno</p>
                        <p className="text-xl font-bold text-blue-700">{formatNumber(results.financials.paybackYears, 1)} Anos</p>
                        <p className="text-xs text-blue-600 mt-1">({formatNumber(results.financials.paybackMonths, 0)} meses)</p>
                    </div>
                    
                    {/* Payback details */}
                    <div className="col-span-1 md:col-span-2 lg:col-span-3 bg-slate-50 p-4 rounded-lg flex items-center gap-4">
                        <TrendingUp className="h-8 w-8 text-slate-400" />
                        <div>
                            <p className="text-sm font-semibold text-slate-700">Projeção de Economia (25 Anos)</p>
                            <p className="text-2xl font-bold text-green-600">{formatCurrency(results.financials.totalSavings25Years)}</p>
                            <p className="text-xs text-slate-500">Considerando investimento inicial de {formatCurrency(results.financials.totalInvestment)} e Custo de Disponibilidade ({client.connectionType})</p>
                        </div>
                    </div>
                </div>
              </div>

              {/* Chart */}
              <div className="rounded-xl bg-white p-6 shadow-sm">
                <h3 className="mb-4 font-bold text-slate-700">Gráfico Comparativo</h3>
                <ConsumptionChart consumption={client.consumption} generation={results.monthlyGeneration} />
              </div>

              {/* Generation Table */}
              <div className="overflow-hidden rounded-xl bg-white shadow-sm">
                <div className="bg-slate-50 px-6 py-4 border-b border-slate-100">
                    <h3 className="font-bold text-slate-700">Previsão de Geração Mensal</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead>
                            <tr className="bg-slate-50 text-slate-500">
                                <th className="px-6 py-3 font-medium">Mês</th>
                                <th className="px-6 py-3 font-medium">Consumo</th>
                                <th className="px-6 py-3 font-medium">Geração Est.</th>
                                <th className="px-6 py-3 font-medium">Balanço</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {monthNames.map(m => {
                                const cons = client.consumption[m.key as keyof MonthlyData];
                                const gen = results.monthlyGeneration[m.key as keyof MonthlyData];
                                const balance = gen - cons;
                                return (
                                    <tr key={m.key} className="hover:bg-slate-50">
                                        <td className="px-6 py-3 font-medium text-slate-700">{m.label}</td>
                                        <td className="px-6 py-3">{formatNumber(cons)}</td>
                                        <td className="px-6 py-3 font-semibold text-green-600">{formatNumber(gen)}</td>
                                        <td className={`px-6 py-3 font-bold ${balance >= 0 ? 'text-blue-600' : 'text-red-500'}`}>
                                            {balance > 0 ? '+' : ''}{formatNumber(balance)}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
                
                 <div className="mt-8 px-6 pb-6 flex items-center justify-between pt-6">
                    <button 
                        onClick={() => handleNextTab('irradiation')} 
                        className="flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                    >
                        <ArrowLeft size={16} />
                        Voltar
                    </button>
                    <button 
                        onClick={() => handleNextTab('status')} 
                        className="flex items-center gap-2 rounded-lg bg-slate-800 px-6 py-2 text-sm font-medium text-white hover:bg-slate-700 shadow-sm"
                    >
                        Próximo
                        <ArrowRight size={16} />
                    </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'status' && (
              <div className="space-y-6 animate-fade-in">
                  
                  {/* INTEGRATION / MATERIALS SECTION */}
                  <div className="rounded-xl bg-white p-6 shadow-sm border border-slate-100">
                      <div className="flex items-center justify-between mb-6 border-b border-slate-100 pb-3">
                        <div className="flex items-center gap-2">
                           <Package className="text-blue-500" size={20} />
                           <h2 className="text-lg font-bold text-slate-800">Integração & Materiais</h2>
                        </div>
                        <button
                          onClick={importSolfacilMock}
                          className="flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-600 hover:bg-blue-100 border border-blue-200"
                        >
                           <DownloadCloud size={14} />
                           Simular Importação
                        </button>
                      </div>

                      <div className="space-y-4">
                        <label className="mb-2 block text-sm font-medium text-gray-700">Lista de Equipamentos</label>
                        
                        <div className="overflow-x-auto rounded-lg border border-slate-200">
                           <table className="w-full text-left text-sm">
                             <thead className="bg-slate-100 text-slate-600 font-medium">
                               <tr>
                                 <th className="px-3 py-2 w-20">Qtd</th>
                                 <th className="px-3 py-2 w-24">Unid.</th>
                                 <th className="px-3 py-2">Modelo / Descrição</th>
                                 <th className="px-3 py-2 w-48">Marca</th>
                                 <th className="px-3 py-2 w-12"></th>
                               </tr>
                             </thead>
                             <tbody className="divide-y divide-slate-100 bg-white">
                               {client.materials.map((item) => (
                                 <tr key={item.id}>
                                   <td className="px-2 py-2">
                                      <input 
                                        type="number" 
                                        className="w-full rounded border border-slate-300 px-2 py-1 text-sm focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none"
                                        value={item.quantity}
                                        onChange={(e) => updateMaterial(item.id, 'quantity', parseFloat(e.target.value))}
                                      />
                                   </td>
                                   <td className="px-2 py-2">
                                      <input 
                                        type="text" 
                                        className="w-full rounded border border-slate-300 px-2 py-1 text-sm focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none"
                                        value={item.unit}
                                        onChange={(e) => updateMaterial(item.id, 'unit', e.target.value)}
                                      />
                                   </td>
                                   <td className="px-2 py-2">
                                      <input 
                                        type="text" 
                                        className="w-full rounded border border-slate-300 px-2 py-1 text-sm focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none"
                                        value={item.model}
                                        onChange={(e) => updateMaterial(item.id, 'model', e.target.value)}
                                      />
                                   </td>
                                   <td className="px-2 py-2">
                                      <input 
                                        type="text" 
                                        className="w-full rounded border border-slate-300 px-2 py-1 text-sm focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none"
                                        value={item.brand}
                                        onChange={(e) => updateMaterial(item.id, 'brand', e.target.value)}
                                      />
                                   </td>
                                   <td className="px-2 py-2 text-center">
                                      <button 
                                        onClick={() => removeMaterial(item.id)}
                                        className="text-slate-400 hover:text-red-500 transition"
                                        title="Remover item"
                                      >
                                         <Trash2 size={16} />
                                      </button>
                                   </td>
                                 </tr>
                               ))}
                               {client.materials.length === 0 && (
                                  <tr>
                                     <td colSpan={5} className="px-4 py-8 text-center text-slate-400 text-sm">
                                        Nenhum material adicionado. Clique em "Adicionar Item" ou importe da Solfácil.
                                     </td>
                                  </tr>
                               )}
                             </tbody>
                           </table>
                        </div>
                        
                        <button 
                           onClick={addMaterial}
                           className="flex items-center gap-2 text-sm font-medium text-amber-600 hover:text-amber-700 mt-2"
                        >
                           <Plus size={16} />
                           Adicionar Item Manualmente
                        </button>

                      </div>
                  </div>

                  {/* NEGOTIATION DETAILS FORM */}
                  <div className="rounded-xl bg-white p-6 shadow-sm border border-slate-100">
                      <div className="flex items-center gap-2 mb-6 border-b border-slate-100 pb-3">
                        <Tag className="text-amber-500" size={20} />
                        <h2 className="text-lg font-bold text-slate-800">Detalhes da Negociação</h2>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                         <div className="flex flex-col">
                            {/* Proposal Value - Managed by MoneyInput now */}
                            <MoneyInput 
                                label="Valor da Proposta"
                                value={client.proposalValue}
                                onChange={(val) => updateClientField('proposalValue', val)}
                                placeholder={formatNumber(results.financials.totalInvestment)}
                            />
                            <p className="mt-1 text-[10px] text-gray-500">
                                Calculado: {formatCurrency(results.financials.totalInvestment)}
                            </p>
                         </div>

                         {/* DISCOUNT FIELD WITH TOGGLE */}
                         <div className="flex flex-col">
                            <label className="mb-1 text-sm font-medium text-gray-700">Desconto</label>
                            <div className="flex items-center gap-2 mb-2">
                                <div className="flex bg-slate-100 rounded-lg p-1">
                                    <button 
                                        onClick={() => updateClientField('discountType', 'fixed')}
                                        className={`px-3 py-1 text-xs font-medium rounded-md transition ${client.discountType === 'fixed' ? 'bg-white shadow text-slate-800' : 'text-slate-500'}`}
                                    >
                                        Valor (R$)
                                    </button>
                                    <button 
                                        onClick={() => updateClientField('discountType', 'percent')}
                                        className={`px-3 py-1 text-xs font-medium rounded-md transition ${client.discountType === 'percent' ? 'bg-white shadow text-slate-800' : 'text-slate-500'}`}
                                    >
                                        Porcentagem (%)
                                    </button>
                                </div>
                            </div>
                            
                            {client.discountType === 'fixed' ? (
                                <MoneyInput 
                                    label=""
                                    value={client.discount || 0}
                                    onChange={(val) => updateClientField('discount', val)}
                                    placeholder="0,00"
                                />
                            ) : (
                                <div className="relative">
                                    <input 
                                        type="number"
                                        step="0.01"
                                        max="100"
                                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 pr-8"
                                        value={client.discountPercent || ''}
                                        onChange={e => updateClientField('discountPercent', parseFloat(e.target.value))}
                                        placeholder="0"
                                    />
                                    <span className="absolute right-3 top-2 text-gray-400 text-sm">%</span>
                                </div>
                            )}
                         </div>

                         <div className="flex flex-col">
                            <label className="mb-1 text-sm font-medium text-gray-700">Valor Final (R$)</label>
                            <div className="w-full rounded-lg border border-slate-200 bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-700 shadow-sm">
                                {formatCurrency(client.finalValue || 0)}
                            </div>
                         </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                        <div className="flex flex-col">
                           <label className="mb-1 text-sm font-medium text-gray-700">Forma de Pagamento</label>
                           <div className="relative">
                             <CreditCard className="absolute left-3 top-2.5 text-gray-400" size={16} />
                             <select 
                               value={client.paymentMethod || ''} 
                               onChange={(e) => updateClientField('paymentMethod', e.target.value as PaymentMethod)}
                               className="w-full rounded-lg border border-gray-300 bg-white pl-10 pr-3 py-2 text-sm shadow-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                             >
                               <option value="">Selecione...</option>
                               <option value="pix">PIX (À Vista)</option>
                               <option value="boleto">Boleto Bancário</option>
                               <option value="credit_card">Cartão de Crédito</option>
                               <option value="debit_card">Cartão de Débito</option>
                               <option value="financing">Financiamento Bancário</option>
                             </select>
                           </div>
                        </div>

                        {client.paymentMethod === 'credit_card' && (
                            <InputGroup 
                              label="Parcelamento (x)" 
                              type="number"
                              min="1"
                              max="18"
                              value={client.installments || 1}
                              onChange={e => updateClientField('installments', parseInt(e.target.value))}
                              placeholder="1"
                            />
                        )}
                        
                        {client.paymentMethod === 'financing' && (
                             <InputGroup 
                              label="Parcelas do Financiamento" 
                              type="number"
                              min="1"
                              max="120"
                              value={client.installments || 1}
                              onChange={e => updateClientField('installments', parseInt(e.target.value))}
                              placeholder="Ex: 60"
                            />
                        )}
                      </div>
                  </div>

                  {/* TIMELINE */}
                  <div className="rounded-xl bg-white p-6 shadow-sm">
                      <h2 className="mb-6 text-lg font-bold text-slate-800">Status do Projeto</h2>
                      
                      <div className="relative border-l-2 border-slate-200 ml-4 space-y-8 py-2">
                          {timelineSteps.map((step, index) => {
                              const isCompleted = index < currentStatusIndex;
                              const isCurrent = index === currentStatusIndex;
                              const isFuture = index > currentStatusIndex;

                              return (
                                  <div key={step.id} className="relative pl-8">
                                      {/* Node Circle */}
                                      <button
                                          onClick={() => updateStatus(step.id)}
                                          className={`absolute -left-[13px] top-0 flex h-7 w-7 items-center justify-center rounded-full border-2 transition-all duration-300 
                                              ${isCompleted ? 'bg-green-500 border-green-500 text-white' : ''}
                                              ${isCurrent ? 'bg-white border-amber-500 text-amber-500 ring-4 ring-amber-100' : ''}
                                              ${isFuture ? 'bg-white border-slate-300 text-slate-300' : ''}
                                          `}
                                      >
                                          {isCompleted ? <CheckCircle size={14} /> : step.icon}
                                      </button>
                                      
                                      {/* Content */}
                                      <div onClick={() => updateStatus(step.id)} className="cursor-pointer">
                                          <h3 className={`font-semibold text-sm ${isCurrent ? 'text-amber-600' : isCompleted ? 'text-green-700' : 'text-slate-400'}`}>
                                              {step.label}
                                          </h3>
                                          <p className="text-xs text-slate-500 mt-1">{step.description}</p>
                                          
                                          {isCurrent && (
                                              <span className="mt-2 inline-block rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-600 border border-amber-100">
                                                  Atualizado em: {new Date(client.statusUpdatedAt || client.updatedAt).toLocaleDateString()}
                                              </span>
                                          )}
                                      </div>
                                  </div>
                              );
                          })}
                      </div>
                  </div>

                  {/* 45 Day Notification Logic + Share Proposal */}
                  {client.status === 'proposal_sent' && (
                      <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 shadow-sm">
                          <div className="flex items-start gap-3">
                              <div className="rounded-full bg-amber-100 p-2 text-amber-600">
                                  <Clock size={24} />
                              </div>
                              <div className="flex-1">
                                  <h3 className="font-bold text-amber-800">Acompanhamento Comercial</h3>
                                  <p className="mt-1 text-sm text-amber-700">
                                      A proposta foi enviada. É importante manter contato com o cliente para sanar dúvidas e fechar o negócio.
                                  </p>
                                  <div className="mt-4 flex flex-col gap-2 rounded-lg bg-white bg-opacity-60 p-3 sm:flex-row sm:items-center sm:justify-between">
                                      <div className="flex items-center gap-2 text-sm text-amber-900">
                                          <Calendar size={16} />
                                          <span className="font-medium">Próximo contato sugerido:</span>
                                      </div>
                                      <div className="font-bold text-amber-600">
                                          {getFollowUpDate(client.statusUpdatedAt || client.updatedAt).toLocaleDateString()} (45 dias)
                                      </div>
                                  </div>
                              </div>
                          </div>

                          <div className="mt-6 border-t border-amber-200 pt-5">
                             <div className="flex items-center gap-2 mb-3">
                                <Share2 size={16} className="text-amber-700"/>
                                <h4 className="text-sm font-bold text-amber-800 uppercase tracking-wide">Compartilhar Proposta</h4>
                             </div>
                             
                             <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                  <button
                                      onClick={generatePDF}
                                      className="flex items-center justify-center gap-2 rounded-lg bg-white border border-amber-200 px-4 py-2.5 text-sm font-medium text-amber-700 shadow-sm hover:bg-amber-100 transition"
                                  >
                                      <FileDown size={18} />
                                      1. Baixar PDF
                                  </button>
                                  
                                  <div className="hidden sm:block"></div> {/* Spacer to keep layout clean if only 2 cols */}

                                  <button
                                      onClick={handleShareWhatsApp}
                                      className="flex items-center justify-center gap-2 rounded-lg bg-[#25D366] text-white px-4 py-2.5 text-sm font-medium shadow-sm hover:bg-[#128C7E] transition border border-transparent"
                                  >
                                      <MessageCircle size={18} />
                                      2. WhatsApp
                                  </button>
                                  
                                  <button
                                      onClick={handleShareEmail}
                                      className="flex items-center justify-center gap-2 rounded-lg bg-blue-600 text-white px-4 py-2.5 text-sm font-medium shadow-sm hover:bg-blue-700 transition border border-transparent"
                                  >
                                      <Mail size={18} />
                                      2. E-mail
                                  </button>
                             </div>
                             <p className="mt-3 text-[10px] text-amber-800 opacity-70">
                                  *Salve o PDF no seu dispositivo antes de enviar para anexá-lo à mensagem.
                             </p>
                          </div>
                      </div>
                  )}

                  {client.status === 'proposal_accepted' && (
                      <div className="rounded-xl border border-green-200 bg-green-50 p-6 shadow-sm">
                           <div className="flex items-center gap-3">
                               <CheckCircle className="text-green-600" size={32} />
                               <div>
                                   <h3 className="font-bold text-green-800">Venda Concluída!</h3>
                                   <p className="text-sm text-green-700">Parabéns pelo fechamento. Inicie o processo de homologação o quanto antes.</p>
                               </div>
                           </div>
                      </div>
                  )}

                  <div className="mt-8 flex items-center justify-between border-t border-slate-100 pt-6">
                      <button 
                          onClick={() => handleNextTab('results')} 
                          className="flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                      >
                          <ArrowLeft size={16} />
                          Voltar
                      </button>
                      <button 
                         onClick={() => navigate('/')}
                         className="flex items-center gap-2 rounded-lg bg-slate-800 px-6 py-2 text-sm font-medium text-white hover:bg-slate-700 shadow-sm"
                      >
                          <CheckCircle size={16} />
                          Finalizar / Voltar ao Início
                      </button>
                  </div>
              </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ClientEditor;
