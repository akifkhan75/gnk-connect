import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  StatusBar,
  Image,
  Alert,
} from 'react-native';

// Standard Mock Data matching AirDesk Supplier Adapter & GNK Connect B2B Store
const INITIAL_PRODUCTS = [
  {
    id: 'gnk-prod-dxb-01',
    supplierProductId: 'AD-DXB-7D-EXP',
    title: 'Dubai Luxury 7-Day Group Departure',
    destination: 'Dubai, UAE',
    durationDays: 7,
    durationNights: 6,
    productType: 'INTERNATIONAL_GROUP',
    heroImage: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?q=80&w=800&auto=format&fit=crop',
    overview: 'All-inclusive 7-day luxury group departure to Dubai featuring 4-star hotel accommodations, Desert Safari, Dhow Cruise, Burj Khalifa tickets, and daily transfers.',
    departures: [
      { id: 'dep-dxb-oct-15', departureDate: '2026-10-15', returnDate: '2026-10-22', totalSeats: 30, availableSeats: 6, supplierNetPricePKR: 185000, sellingPricePKR: 197000 },
      { id: 'dep-dxb-nov-01', departureDate: '2026-11-01', returnDate: '2026-11-08', totalSeats: 30, availableSeats: 14, supplierNetPricePKR: 185000, sellingPricePKR: 197000 },
    ],
    inclusions: ['Return Direct Flight Air Tickets', '4-Star Hotel Bed & Breakfast', 'Desert Safari with BBQ Dinner', 'Dubai Marina Luxury Dhow Cruise', 'Airport Meet & Assist']
  },
  {
    id: 'gnk-prod-ksa-02',
    supplierProductId: 'AD-KSA-15D-UMRAH',
    title: 'Saudi Executive Umrah 15-Day Group',
    destination: 'Makkah & Madinah, Saudi Arabia',
    durationDays: 15,
    durationNights: 14,
    productType: 'UMRAH_GROUP',
    heroImage: 'https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa?q=80&w=800&auto=format&fit=crop',
    overview: 'Spiritual 15-day group departure featuring 5-star Swissotel Al Maqam Makkah & Pullman Zamzam Madinah, Haramain High-Speed Train, and full Ziyarat.',
    departures: [
      { id: 'dep-ksa-oct-20', departureDate: '2026-10-20', returnDate: '2026-11-04', totalSeats: 45, availableSeats: 8, supplierNetPricePKR: 225000, sellingPricePKR: 236250 },
      { id: 'dep-ksa-nov-10', departureDate: '2026-11-10', returnDate: '2026-11-25', totalSeats: 45, availableSeats: 19, supplierNetPricePKR: 225000, sellingPricePKR: 236250 },
    ],
    inclusions: ['Direct Flights with Saudia/PIA', '5-Star Clock Tower Hotels', 'Private Haramain High-Speed Train', 'Guided Ziyarat Tours in AC Coaches', 'Umrah E-Visa & Mandatory Insurance']
  },
  {
    id: 'gnk-prod-tur-03',
    supplierProductId: 'AD-TUR-8D-CAP',
    title: 'Turkey & Cappadocia 8-Day Panoramic Group',
    destination: 'Istanbul & Cappadocia, Turkey',
    durationDays: 8,
    durationNights: 7,
    productType: 'INTERNATIONAL_GROUP',
    heroImage: 'https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?q=80&w=800&auto=format&fit=crop',
    overview: 'Explore historical Istanbul, Bosphorus Sunset Cruise, and the magical fairy chimneys of Cappadocia with optional Hot Air Balloon rides.',
    departures: [
      { id: 'dep-tur-oct-25', departureDate: '2026-10-25', returnDate: '2026-11-01', totalSeats: 25, availableSeats: 5, supplierNetPricePKR: 210000, sellingPricePKR: 226800 },
      { id: 'dep-tur-nov-15', departureDate: '2026-11-15', returnDate: '2026-11-22', totalSeats: 25, availableSeats: 11, supplierNetPricePKR: 210000, sellingPricePKR: 226800 },
    ],
    inclusions: ['International & Domestic Flights', '4-Star Boutique Hotel Stays', 'Cappadocia Valley Day Tours', 'Bosphorus Dinner Cruise', 'Turkish Sticker Visa File Guidance']
  },
  {
    id: 'gnk-prod-mys-04',
    supplierProductId: 'AD-MYS-6D-LGK',
    title: 'Malaysia & Langkawi 6-Day Island Explorer',
    destination: 'Kuala Lumpur & Langkawi, Malaysia',
    durationDays: 6,
    durationNights: 5,
    productType: 'INTERNATIONAL_GROUP',
    heroImage: 'https://images.unsplash.com/photo-1596422846543-75c6fc197f07?q=80&w=800&auto=format&fit=crop',
    overview: 'Exciting twin-destination tour combining vibrant Kuala Lumpur city life and relaxing Langkawi beach resorts.',
    departures: [
      { id: 'dep-mys-nov-05', departureDate: '2026-11-05', returnDate: '2026-11-10', totalSeats: 30, availableSeats: 12, supplierNetPricePKR: 165000, sellingPricePKR: 178200 },
    ],
    inclusions: ['Return Direct Flights', 'Beachfront Resort & City Hotel', 'Langkawi Island Cable Car', 'Batu Caves & Genting Day Trip', 'Private Sightseeing Coaches']
  }
];

const INITIAL_BOOKINGS = [
  {
    id: 'GNK-2026-00124',
    supplierBookingId: 'AD-849302',
    supplierPnr: 'PNR-AD-9302',
    productTitle: 'Dubai Luxury 7-Day Group Departure',
    departureDate: '2026-10-15',
    returnDate: '2026-10-22',
    totalSeats: 2,
    totalAmountPKR: 394000,
    status: 'SUPPLIER_CONFIRMED',
    passengers: [
      { firstName: 'Kamran', lastName: 'Akhtar', passportNumber: 'PK8392018', type: 'ADULT' },
      { firstName: 'Samina', lastName: 'Kamran', passportNumber: 'PK8392019', type: 'ADULT' }
    ]
  },
  {
    id: 'GNK-2026-00125',
    supplierBookingId: 'AD-920184',
    supplierPnr: 'PNR-AD-0184',
    productTitle: 'Saudi Executive Umrah 15-Day Group',
    departureDate: '2026-10-20',
    returnDate: '2026-11-04',
    totalSeats: 3,
    totalAmountPKR: 708750,
    status: 'PENDING_APPROVAL',
    passengers: [
      { firstName: 'Tariq', lastName: 'Mansoor', passportNumber: 'PK9920182', type: 'ADULT' },
      { firstName: 'Fatima', lastName: 'Tariq', passportNumber: 'PK9920183', type: 'ADULT' },
      { firstName: 'Zainab', lastName: 'Tariq', passportNumber: 'PK9920184', type: 'CHILD' }
    ]
  }
];

const INITIAL_LEDGER = [
  { id: 'TXN-01', type: 'CREDIT_DEPOSIT', amountPKR: 1500000, balancePKR: 1500000, desc: 'Advance wholesale deposit for group allocations', date: '2026-08-01' },
  { id: 'TXN-02', type: 'BOOKING_DEBIT', amountPKR: 394000, balancePKR: 1106000, desc: 'Booking GNK-2026-00124 (Dubai 7-Day, 2 Pax)', date: '2026-08-10' },
  { id: 'TXN-03', type: 'COMMISSION_PAYOUT', amountPKR: 50000, balancePKR: 1156000, desc: 'Q3 Reseller Early-Bird Tier Bonus', date: '2026-08-31' },
];

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'groups' | 'bookings' | 'wallet' | 'profile'>('dashboard');
  const [products] = useState(INITIAL_PRODUCTS);
  const [bookings, setBookings] = useState(INITIAL_BOOKINGS);
  const [ledger, setLedger] = useState(INITIAL_LEDGER);
  const [walletBalance, setWalletBalance] = useState(450000);
  const creditLimit = 1500000;

  // Search & Category Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');

  // Booking Sheet Modal State
  const [bookingModalVisible, setBookingModalVisible] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [selectedDeparture, setSelectedDeparture] = useState<any>(null);
  const [paxCount, setPaxCount] = useState(2);
  const [paxFirstName, setPaxFirstName] = useState('');
  const [paxLastName, setPaxLastName] = useState('');
  const [paxPassport, setPaxPassport] = useState('');

  // Voucher Modal State
  const [voucherModalVisible, setVoucherModalVisible] = useState(false);
  const [selectedVoucherBooking, setSelectedVoucherBooking] = useState<any>(null);

  // Top Up Modal State
  const [topUpModalVisible, setTopUpModalVisible] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState('250000');
  const [topUpRef, setTopUpRef] = useState('HBL-FT-938201');

  const openBookingModal = (product: any) => {
    setSelectedProduct(product);
    setSelectedDeparture(product.departures[0]);
    setPaxCount(2);
    setPaxFirstName('Muhammad');
    setPaxLastName('Rashid');
    setPaxPassport('PK8920192');
    setBookingModalVisible(true);
  };

  const handleConfirmBooking = () => {
    if (!paxFirstName || !paxLastName || !paxPassport) {
      Alert.alert('Error', 'Please provide passenger details');
      return;
    }

    const totalCost = (selectedDeparture?.sellingPricePKR || 197000) * paxCount;
    const newBookingId = `GNK-2026-${Math.floor(10000 + Math.random() * 90000)}`;

    const newBooking = {
      id: newBookingId,
      supplierBookingId: `AD-${Math.floor(100000 + Math.random() * 900000)}`,
      supplierPnr: `PNR-AD-${Math.floor(1000 + Math.random() * 9000)}`,
      productTitle: selectedProduct.title,
      departureDate: selectedDeparture.departureDate,
      returnDate: selectedDeparture.returnDate,
      totalSeats: paxCount,
      totalAmountPKR: totalCost,
      status: 'SUPPLIER_CONFIRMED',
      passengers: [
        { firstName: paxFirstName, lastName: paxLastName, passportNumber: paxPassport, type: 'ADULT' }
      ]
    };

    setBookings([newBooking, ...bookings]);

    // Record ledger debit
    const newTxn = {
      id: `TXN-${Date.now().toString().slice(-4)}`,
      type: 'BOOKING_DEBIT',
      amountPKR: totalCost,
      balancePKR: walletBalance - totalCost,
      desc: `Instant Mobile Booking: ${newBookingId} (${paxCount} Pax)`,
      date: new Date().toISOString().slice(0, 10)
    };
    setLedger([newTxn, ...ledger]);
    setWalletBalance(prev => prev - totalCost);

    setBookingModalVisible(false);
    Alert.alert(
      '🎉 Booking Confirmed!',
      `Booking ${newBookingId} has been confirmed by AirDesk API with PNR: ${newBooking.supplierPnr}. E-Voucher is ready to view.`,
      [{ text: 'View Bookings', onPress: () => setActiveTab('bookings') }]
    );
  };

  const handleTopUpSubmit = () => {
    const amount = Number(topUpAmount) || 250000;
    const newBalance = walletBalance + amount;
    setWalletBalance(newBalance);

    const newTxn = {
      id: `TXN-${Date.now().toString().slice(-4)}`,
      type: 'CREDIT_DEPOSIT',
      amountPKR: amount,
      balancePKR: newBalance,
      desc: `Wallet Top-Up via Bank Wire (${topUpRef})`,
      date: new Date().toISOString().slice(0, 10)
    };
    setLedger([newTxn, ...ledger]);
    setTopUpModalVisible(false);
    Alert.alert('Deposit Credited', `PKR ${amount.toLocaleString()} has been added to your float.`);
  };

  const filteredProducts = products.filter(p => {
    if (selectedCategory !== 'ALL') {
      if (selectedCategory === 'DUBAI' && !p.destination.includes('Dubai')) return false;
      if (selectedCategory === 'UMRAH' && !p.destination.includes('Saudi')) return false;
      if (selectedCategory === 'TURKEY' && !p.destination.includes('Turkey')) return false;
      if (selectedCategory === 'MALAYSIA' && !p.destination.includes('Malaysia')) return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return p.title.toLowerCase().includes(q) || p.destination.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#020617" />

      {/* Top Mobile App Header */}
      <View style={styles.topBar}>
        <View style={styles.brandRow}>
          <View style={styles.logoBadge}>
            <Text style={styles.logoIcon}>🧭</Text>
          </View>
          <View>
            <Text style={styles.brandTitle}>GNK <Text style={styles.cyanText}>ELITE</Text></Text>
            <Text style={styles.agencyBadge}>ABC Travels & Tours • Verified</Text>
          </View>
        </View>

        <TouchableOpacity 
          style={styles.walletHeaderBtn}
          onPress={() => setActiveTab('wallet')}
        >
          <Text style={styles.walletHeaderSub}>Float</Text>
          <Text style={styles.walletHeaderAmount}>PKR {(walletBalance / 1000).toFixed(0)}k</Text>
        </TouchableOpacity>
      </View>

      {/* Main Screen Content */}
      <View style={styles.mainArea}>
        {activeTab === 'dashboard' && (
          <ScrollView contentContainerStyle={styles.scrollContent}>
            {/* Balance Overview Card */}
            <View style={styles.balanceCard}>
              <View style={styles.balanceHeader}>
                <Text style={styles.balanceTitle}>Wholesale Wallet & Credit Line</Text>
                <View style={styles.verifiedTag}>
                  <Text style={styles.verifiedText}>DTS-KHI-4920</Text>
                </View>
              </View>

              <Text style={styles.balanceBig}>PKR {walletBalance.toLocaleString()}</Text>
              <Text style={styles.creditSub}>
                Credit Line: <Text style={styles.whiteText}>PKR {creditLimit.toLocaleString()}</Text> • Available: <Text style={styles.cyanText}>PKR {(walletBalance + creditLimit).toLocaleString()}</Text>
              </Text>

              <View style={styles.balanceActions}>
                <TouchableOpacity 
                  style={styles.topUpBtn}
                  onPress={() => setTopUpModalVisible(true)}
                >
                  <Text style={styles.topUpBtnText}>+ Top-Up Float</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.soaBtn}
                  onPress={() => setActiveTab('wallet')}
                >
                  <Text style={styles.soaBtnText}>Statement of Account</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Quick Action Buttons */}
            <View style={styles.quickGrid}>
              <TouchableOpacity 
                style={styles.quickCard}
                onPress={() => setActiveTab('groups')}
              >
                <Text style={styles.quickIcon}>✈️</Text>
                <Text style={styles.quickTitle}>AirDesk Groups</Text>
                <Text style={styles.quickDesc}>Live Wholesale Series</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.quickCard}
                onPress={() => setActiveTab('bookings')}
              >
                <Text style={styles.quickIcon}>📄</Text>
                <Text style={styles.quickTitle}>My Bookings</Text>
                <Text style={styles.quickDesc}>{bookings.length} Active Reservations</Text>
              </TouchableOpacity>
            </View>

            {/* Live AirDesk Group Series Showcase */}
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Featured Group Departures</Text>
              <TouchableOpacity onPress={() => setActiveTab('groups')}>
                <Text style={styles.seeAllText}>See All ({products.length}) →</Text>
              </TouchableOpacity>
            </View>

            {products.slice(0, 2).map((p) => {
              const dep = p.departures[0];
              return (
                <View key={p.id} style={styles.miniGroupCard}>
                  <Image source={{ uri: p.heroImage }} style={styles.miniCardImage} />
                  <View style={styles.miniCardBody}>
                    <View style={styles.badgeRow}>
                      <Text style={styles.depDateText}>📅 {dep?.departureDate}</Text>
                      <Text style={styles.seatBadgeText}>{dep?.availableSeats} Seats Left</Text>
                    </View>
                    <Text style={styles.miniCardTitle}>{p.title}</Text>
                    <View style={styles.miniCardFooter}>
                      <View>
                        <Text style={styles.netLabel}>Agent Selling Price</Text>
                        <Text style={styles.miniPrice}>PKR {dep?.sellingPricePKR.toLocaleString()}</Text>
                      </View>
                      <TouchableOpacity 
                        style={styles.bookNowMiniBtn}
                        onPress={() => openBookingModal(p)}
                      >
                        <Text style={styles.bookNowMiniText}>Book Now</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              );
            })}
          </ScrollView>
        )}

        {activeTab === 'groups' && (
          <ScrollView contentContainerStyle={styles.scrollContent}>
            {/* Search Input */}
            <View style={styles.searchBox}>
              <Text style={styles.searchIcon}>🔍</Text>
              <TextInput
                placeholder="Search group departures, cities, tours..."
                placeholderTextColor="#64748b"
                value={searchQuery}
                onChangeText={setSearchQuery}
                style={styles.searchInput}
              />
            </View>

            {/* Category Filter Pills */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catScroll}>
              {[
                { id: 'ALL', label: 'All Series' },
                { id: 'DUBAI', label: 'Dubai (UAE)' },
                { id: 'UMRAH', label: 'Saudi Umrah' },
                { id: 'TURKEY', label: 'Turkey' },
                { id: 'MALAYSIA', label: 'Malaysia' },
              ].map(cat => (
                <TouchableOpacity
                  key={cat.id}
                  onPress={() => setSelectedCategory(cat.id)}
                  style={[styles.catPill, selectedCategory === cat.id && styles.activeCatPill]}
                >
                  <Text style={[styles.catPillText, selectedCategory === cat.id && styles.activeCatPillText]}>
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Products List */}
            {filteredProducts.map(p => {
              const dep = p.departures[0];
              return (
                <View key={p.id} style={styles.fullGroupCard}>
                  <Image source={{ uri: p.heroImage }} style={styles.fullCardImg} />
                  <View style={styles.fullCardBody}>
                    <View style={styles.fullCardHeader}>
                      <Text style={styles.fullCardDest}>📍 {p.destination}</Text>
                      <Text style={styles.durationBadge}>{p.durationDays}D / {p.durationNights}N</Text>
                    </View>

                    <Text style={styles.fullCardTitle}>{p.title}</Text>
                    <Text style={styles.fullCardOverview} numberOfLines={2}>{p.overview}</Text>

                    {/* Inclusions */}
                    <View style={styles.incRow}>
                      {p.inclusions.slice(0, 3).map((inc, i) => (
                        <Text key={i} style={styles.incText} numberOfLines={1}>✓ {inc}</Text>
                      ))}
                    </View>

                    {/* Schedule selector summary */}
                    <View style={styles.depPickerSummary}>
                      <Text style={styles.depPickerTitle}>Departure: <Text style={styles.cyanText}>{dep?.departureDate}</Text></Text>
                      <Text style={styles.seatsLeftTag}>{dep?.availableSeats} Seats Available</Text>
                    </View>

                    <View style={styles.fullCardFooter}>
                      <View>
                        <Text style={styles.netLabel}>Agent Rate (5-Tier Margin)</Text>
                        <Text style={styles.fullCardPrice}>PKR {dep?.sellingPricePKR.toLocaleString()} <Text style={styles.paxUnit}>/ pax</Text></Text>
                      </View>

                      <TouchableOpacity 
                        style={styles.fullBookBtn}
                        onPress={() => openBookingModal(p)}
                      >
                        <Text style={styles.fullBookBtnText}>Instant Book</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              );
            })}
          </ScrollView>
        )}

        {activeTab === 'bookings' && (
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <Text style={styles.sectionTitle}>Partner Reservations ({bookings.length})</Text>
            <Text style={styles.sectionSubtitle}>AirDesk PNR synchronization & travel vouchers</Text>

            {bookings.map(b => (
              <View key={b.id} style={styles.bookingCard}>
                <View style={styles.bookingHeader}>
                  <View>
                    <Text style={styles.bookingGnkId}>{b.id}</Text>
                    <Text style={styles.bookingPnr}>Supplier PNR: <Text style={styles.emeraldText}>{b.supplierPnr}</Text></Text>
                  </View>
                  <View style={b.status === 'SUPPLIER_CONFIRMED' ? styles.statusConfirmed : styles.statusPending}>
                    <Text style={b.status === 'SUPPLIER_CONFIRMED' ? styles.statusTextConfirmed : styles.statusTextPending}>
                      {b.status === 'SUPPLIER_CONFIRMED' ? '✓ Confirmed' : '⏳ Review'}
                    </Text>
                  </View>
                </View>

                <Text style={styles.bookingTourTitle}>{b.productTitle}</Text>
                
                <View style={styles.bookingInfoRow}>
                  <Text style={styles.bookingInfoText}>📅 {b.departureDate} → {b.returnDate}</Text>
                  <Text style={styles.bookingInfoText}>👥 {b.totalSeats} Passenger(s)</Text>
                </View>

                <View style={styles.bookingFooterRow}>
                  <View>
                    <Text style={styles.netLabel}>Total Invoiced</Text>
                    <Text style={styles.bookingPrice}>PKR {b.totalAmountPKR.toLocaleString()}</Text>
                  </View>

                  <TouchableOpacity
                    style={styles.voucherBtn}
                    onPress={() => {
                      setSelectedVoucherBooking(b);
                      setVoucherModalVisible(true);
                    }}
                  >
                    <Text style={styles.voucherBtnText}>📱 Open E-Voucher</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </ScrollView>
        )}

        {activeTab === 'wallet' && (
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <View style={styles.balanceCard}>
              <Text style={styles.balanceTitle}>Agent Running Float Balance</Text>
              <Text style={styles.balanceBig}>PKR {walletBalance.toLocaleString()}</Text>
              <Text style={styles.creditSub}>Credit Line: PKR {creditLimit.toLocaleString()} • Approved</Text>

              <TouchableOpacity 
                style={[styles.topUpBtn, { marginTop: 14 }]}
                onPress={() => setTopUpModalVisible(true)}
              >
                <Text style={styles.topUpBtnText}>+ Deposit Bank Wire</Text>
              </TouchableOpacity>
            </View>

            <Text style={[styles.sectionTitle, { marginTop: 16 }]}>Ledger Statement Entries</Text>
            {ledger.map(txn => (
              <View key={txn.id} style={styles.txnItem}>
                <View style={styles.txnIconBox}>
                  <Text style={styles.txnEmoji}>{txn.type === 'BOOKING_DEBIT' ? '📉' : '📈'}</Text>
                </View>
                <View style={styles.txnBody}>
                  <Text style={styles.txnDesc}>{txn.desc}</Text>
                  <Text style={styles.txnDate}>{txn.date} • {txn.id}</Text>
                </View>
                <View style={styles.txnRight}>
                  <Text style={txn.type === 'BOOKING_DEBIT' ? styles.txnDebit : styles.txnCredit}>
                    {txn.type === 'BOOKING_DEBIT' ? '-' : '+'}PKR {txn.amountPKR.toLocaleString()}
                  </Text>
                  <Text style={styles.txnBal}>Bal: {(txn.balancePKR / 1000).toFixed(0)}k</Text>
                </View>
              </View>
            ))}
          </ScrollView>
        )}

        {activeTab === 'profile' && (
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <View style={styles.profileCard}>
              <View style={styles.profileAvatar}>
                <Text style={styles.profileInitial}>TM</Text>
              </View>
              <Text style={styles.profileName}>Tariq Mansoor</Text>
              <Text style={styles.profileRole}>Agency Owner & Managing Director</Text>
              <View style={styles.approvedPill}>
                <Text style={styles.approvedPillText}>✓ Verified B2B Partner</Text>
              </View>
            </View>

            <View style={styles.infoCard}>
              <Text style={styles.infoCardTitle}>Agency Compliance & Credentials</Text>
              
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Agency Name</Text>
                <Text style={styles.infoVal}>ABC Travels & Tours</Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>DTS Tourism License</Text>
                <Text style={[styles.infoVal, styles.cyanText]}>DTS-KHI-4920 (Verified)</Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>FBR Tax NTN</Text>
                <Text style={styles.infoVal}>7392810-4</Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>City & Office</Text>
                <Text style={styles.infoVal}>Shahrah-e-Faisal, Karachi</Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>24/7 Operations Hotline</Text>
                <Text style={[styles.infoVal, styles.emeraldText]}>+92 21 34567890</Text>
              </View>
            </View>
          </ScrollView>
        )}
      </View>

      {/* Bottom Navigation Tabs */}
      <View style={styles.bottomNav}>
        <TouchableOpacity 
          style={styles.navItem} 
          onPress={() => setActiveTab('dashboard')}
        >
          <Text style={[styles.navIcon, activeTab === 'dashboard' && styles.navIconActive]}>🏠</Text>
          <Text style={[styles.navText, activeTab === 'dashboard' && styles.navTextActive]}>Home</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.navItem} 
          onPress={() => setActiveTab('groups')}
        >
          <Text style={[styles.navIcon, activeTab === 'groups' && styles.navIconActive]}>✈️</Text>
          <Text style={[styles.navText, activeTab === 'groups' && styles.navTextActive]}>Groups</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.navItem} 
          onPress={() => setActiveTab('bookings')}
        >
          <Text style={[styles.navIcon, activeTab === 'bookings' && styles.navIconActive]}>📋</Text>
          <Text style={[styles.navText, activeTab === 'bookings' && styles.navTextActive]}>Bookings</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.navItem} 
          onPress={() => setActiveTab('wallet')}
        >
          <Text style={[styles.navIcon, activeTab === 'wallet' && styles.navIconActive]}>💳</Text>
          <Text style={[styles.navText, activeTab === 'wallet' && styles.navTextActive]}>Wallet</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.navItem} 
          onPress={() => setActiveTab('profile')}
        >
          <Text style={[styles.navIcon, activeTab === 'profile' && styles.navIconActive]}>👤</Text>
          <Text style={[styles.navText, activeTab === 'profile' && styles.navTextActive]}>Profile</Text>
        </TouchableOpacity>
      </View>

      {/* 1. Fast-Booking Bottom Sheet Modal */}
      <Modal visible={bookingModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>⚡ Instant Group Booking</Text>
              <TouchableOpacity onPress={() => setBookingModalVisible(false)}>
                <Text style={styles.closeBtnText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <Text style={styles.modalTourName}>{selectedProduct?.title}</Text>
              <Text style={styles.modalTourDest}>📍 {selectedProduct?.destination} • {selectedProduct?.durationDays} Days</Text>

              {/* Departure Picker */}
              <Text style={styles.inputLabel}>Select Departure Date</Text>
              <View style={styles.depOptions}>
                {selectedProduct?.departures.map((d: any) => (
                  <TouchableOpacity
                    key={d.id}
                    onPress={() => setSelectedDeparture(d)}
                    style={[styles.depOptionCard, selectedDeparture?.id === d.id && styles.depOptionCardActive]}
                  >
                    <Text style={styles.depOptionDate}>{d.departureDate}</Text>
                    <Text style={styles.depOptionSeats}>{d.availableSeats} seats left</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Passengers Count */}
              <Text style={styles.inputLabel}>Number of Seats</Text>
              <View style={styles.counterRow}>
                <TouchableOpacity onPress={() => setPaxCount(Math.max(1, paxCount - 1))} style={styles.counterBtn}>
                  <Text style={styles.counterBtnText}>-</Text>
                </TouchableOpacity>
                <Text style={styles.counterVal}>{paxCount} Adult(s)</Text>
                <TouchableOpacity onPress={() => setPaxCount(paxCount + 1)} style={styles.counterBtn}>
                  <Text style={styles.counterBtnText}>+</Text>
                </TouchableOpacity>
              </View>

              {/* Lead Passenger Name & Passport */}
              <Text style={styles.inputLabel}>Lead Passenger First Name</Text>
              <TextInput
                style={styles.modalInput}
                value={paxFirstName}
                onChangeText={setPaxFirstName}
                placeholder="First Name"
                placeholderTextColor="#64748b"
              />

              <Text style={styles.inputLabel}>Lead Passenger Last Name</Text>
              <TextInput
                style={styles.modalInput}
                value={paxLastName}
                onChangeText={setPaxLastName}
                placeholder="Last Name"
                placeholderTextColor="#64748b"
              />

              <Text style={styles.inputLabel}>Passport Number</Text>
              <TextInput
                style={styles.modalInput}
                value={paxPassport}
                onChangeText={setPaxPassport}
                placeholder="e.g. PK8392018"
                placeholderTextColor="#64748b"
              />

              {/* Price Calculation Box */}
              <View style={styles.priceSummaryBox}>
                <View style={styles.priceSummaryRow}>
                  <Text style={styles.priceSummaryLabel}>Rate per Seat:</Text>
                  <Text style={styles.whiteText}>PKR {selectedDeparture?.sellingPricePKR.toLocaleString()}</Text>
                </View>
                <View style={styles.priceSummaryRow}>
                  <Text style={styles.priceSummaryLabel}>Total Deduction:</Text>
                  <Text style={styles.priceSummaryTotal}>
                    PKR {((selectedDeparture?.sellingPricePKR || 197000) * paxCount).toLocaleString()}
                  </Text>
                </View>
                <Text style={styles.paymentMethodNote}>Payment: Instant deduction from Agency Float Balance</Text>
              </View>

              <TouchableOpacity 
                style={styles.confirmBookingBtn}
                onPress={handleConfirmBooking}
              >
                <Text style={styles.confirmBookingText}>Confirm & Push to AirDesk API</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* 2. Mobile E-Voucher QR Modal */}
      <Modal visible={voucherModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.voucherModalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>🎫 Official B2B E-Voucher</Text>
              <TouchableOpacity onPress={() => setVoucherModalVisible(false)}>
                <Text style={styles.closeBtnText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.voucherBody}>
              {/* QR Code Graphic Box */}
              <View style={styles.qrContainer}>
                <View style={styles.qrMock}>
                  <Text style={styles.qrMockIcon}>📱</Text>
                  <Text style={styles.qrMockCode}>QR CODE VERIFIED</Text>
                  <Text style={styles.qrMockAuth}>AUTH-GNK-2026-9482</Text>
                </View>

                <View style={styles.pnrBadge}>
                  <Text style={styles.pnrLabel}>Supplier AirDesk PNR</Text>
                  <Text style={styles.pnrVal}>{selectedVoucherBooking?.supplierPnr || 'PNR-AD-8921'}</Text>
                  <Text style={styles.gnkIdSub}>GNK ID: {selectedVoucherBooking?.id}</Text>
                </View>
              </View>

              <Text style={styles.voucherTourTitle}>{selectedVoucherBooking?.productTitle}</Text>
              
              <View style={styles.voucherDetailsGrid}>
                <View style={styles.voucherGridItem}>
                  <Text style={styles.voucherGridLabel}>Departure Date</Text>
                  <Text style={styles.voucherGridVal}>{selectedVoucherBooking?.departureDate}</Text>
                </View>
                <View style={styles.voucherGridItem}>
                  <Text style={styles.voucherGridLabel}>Return Date</Text>
                  <Text style={styles.voucherGridVal}>{selectedVoucherBooking?.returnDate}</Text>
                </View>
              </View>

              <View style={styles.passengerList}>
                <Text style={styles.passengerListTitle}>Confirmed Passengers ({selectedVoucherBooking?.passengers.length || 2} Pax)</Text>
                {selectedVoucherBooking?.passengers.map((p: any, idx: number) => (
                  <View key={idx} style={styles.passengerItem}>
                    <Text style={styles.passengerName}>{idx + 1}. {p.firstName} {p.lastName}</Text>
                    <Text style={styles.passengerPassport}>Passport: {p.passportNumber}</Text>
                  </View>
                ))}
              </View>

              <View style={styles.voucherHelpBox}>
                <Text style={styles.helpTitle}>Meeting Point & Emergency Desk</Text>
                <Text style={styles.helpDesc}>Present this voucher along with original passports at airport departure terminal. 24/7 Helpline: +92 21 34567890</Text>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* 3. Top-Up Wallet Modal */}
      <Modal visible={topUpModalVisible} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.topUpModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>💳 Top-Up Wallet Float</Text>
              <TouchableOpacity onPress={() => setTopUpModalVisible(false)}>
                <Text style={styles.closeBtnText}>✕</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Deposit Amount (PKR)</Text>
            <TextInput
              style={styles.modalInput}
              keyboardType="numeric"
              value={topUpAmount}
              onChangeText={setTopUpAmount}
            />

            <Text style={styles.inputLabel}>Bank Transfer Reference #</Text>
            <TextInput
              style={styles.modalInput}
              value={topUpRef}
              onChangeText={setTopUpRef}
              placeholder="e.g. HBL-FT-948201"
              placeholderTextColor="#64748b"
            />

            <View style={styles.bankDetailCard}>
              <Text style={styles.bankName}>Habib Bank Limited (HBL)</Text>
              <Text style={styles.bankIban}>IBAN: PK36HABB0004279820182301</Text>
              <Text style={styles.bankTitle}>Account: GNK Connect Global Travel (Pvt) Ltd</Text>
            </View>

            <TouchableOpacity 
              style={styles.confirmBookingBtn}
              onPress={handleTopUpSubmit}
            >
              <Text style={styles.confirmBookingText}>Submit Deposit Proof</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020617',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#0f172a',
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoBadge: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#06b6d4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoIcon: {
    fontSize: 20,
  },
  brandTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#ffffff',
  },
  agencyBadge: {
    fontSize: 10,
    color: '#94a3b8',
    marginTop: 1,
  },
  walletHeaderBtn: {
    backgroundColor: '#1e293b',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    alignItems: 'flex-end',
    borderWidth: 1,
    borderColor: '#334155',
  },
  walletHeaderSub: {
    fontSize: 9,
    color: '#94a3b8',
    textTransform: 'uppercase',
  },
  walletHeaderAmount: {
    fontSize: 12,
    fontWeight: '900',
    color: '#22d3ee',
  },
  mainArea: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 24,
  },
  balanceCard: {
    backgroundColor: '#0f172a',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: '#1e293b',
    marginBottom: 16,
  },
  balanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  balanceTitle: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '700',
  },
  verifiedTag: {
    backgroundColor: '#064e3b',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  verifiedText: {
    color: '#34d399',
    fontSize: 10,
    fontWeight: '700',
  },
  balanceBig: {
    color: '#22d3ee',
    fontSize: 32,
    fontWeight: '900',
  },
  creditSub: {
    color: '#64748b',
    fontSize: 11,
    marginTop: 4,
  },
  balanceActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  topUpBtn: {
    flex: 1,
    backgroundColor: '#06b6d4',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  topUpBtnText: {
    color: '#020617',
    fontWeight: '900',
    fontSize: 13,
  },
  soaBtn: {
    flex: 1,
    backgroundColor: '#1e293b',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  soaBtnText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 13,
  },
  quickGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  quickCard: {
    flex: 1,
    backgroundColor: '#0f172a',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  quickIcon: {
    fontSize: 22,
    marginBottom: 6,
  },
  quickTitle: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 14,
  },
  quickDesc: {
    color: '#64748b',
    fontSize: 10,
    marginTop: 2,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '900',
  },
  sectionSubtitle: {
    color: '#64748b',
    fontSize: 11,
    marginBottom: 12,
  },
  seeAllText: {
    color: '#22d3ee',
    fontSize: 12,
    fontWeight: '700',
  },
  miniGroupCard: {
    backgroundColor: '#0f172a',
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#1e293b',
    marginBottom: 14,
  },
  miniCardImage: {
    width: '100%',
    height: 120,
  },
  miniCardBody: {
    padding: 14,
  },
  badgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  depDateText: {
    color: '#22d3ee',
    fontSize: 11,
    fontWeight: '800',
  },
  seatBadgeText: {
    color: '#34d399',
    fontSize: 10,
    fontWeight: '800',
  },
  miniCardTitle: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 10,
  },
  miniCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
    paddingTop: 10,
  },
  netLabel: {
    fontSize: 9,
    color: '#64748b',
    textTransform: 'uppercase',
  },
  miniPrice: {
    fontSize: 15,
    fontWeight: '900',
    color: '#ffffff',
  },
  bookNowMiniBtn: {
    backgroundColor: '#06b6d4',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  bookNowMiniText: {
    color: '#020617',
    fontWeight: '900',
    fontSize: 12,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    borderRadius: 14,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#1e293b',
    marginBottom: 12,
  },
  searchIcon: {
    fontSize: 14,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    color: '#ffffff',
    fontSize: 13,
  },
  catScroll: {
    marginBottom: 14,
  },
  catPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#1e293b',
    marginRight: 8,
  },
  activeCatPill: {
    backgroundColor: '#06b6d4',
    borderColor: '#06b6d4',
  },
  catPillText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '700',
  },
  activeCatPillText: {
    color: '#020617',
    fontWeight: '900',
  },
  fullGroupCard: {
    backgroundColor: '#0f172a',
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#1e293b',
    marginBottom: 18,
  },
  fullCardImg: {
    width: '100%',
    height: 150,
  },
  fullCardBody: {
    padding: 16,
  },
  fullCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  fullCardDest: {
    color: '#22d3ee',
    fontSize: 11,
    fontWeight: '800',
  },
  durationBadge: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '700',
  },
  fullCardTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '900',
    marginBottom: 4,
  },
  fullCardOverview: {
    color: '#94a3b8',
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 10,
  },
  incRow: {
    marginBottom: 10,
  },
  incText: {
    color: '#cbd5e1',
    fontSize: 11,
    marginBottom: 2,
  },
  depPickerSummary: {
    backgroundColor: '#020617',
    padding: 10,
    borderRadius: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  depPickerTitle: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  seatsLeftTag: {
    color: '#34d399',
    fontSize: 11,
    fontWeight: '800',
  },
  fullCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
    paddingTop: 12,
  },
  fullCardPrice: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '900',
  },
  paxUnit: {
    fontSize: 10,
    color: '#64748b',
  },
  fullBookBtn: {
    backgroundColor: '#06b6d4',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  fullBookBtnText: {
    color: '#020617',
    fontWeight: '900',
    fontSize: 13,
  },
  bookingCard: {
    backgroundColor: '#0f172a',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1e293b',
    marginBottom: 14,
  },
  bookingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  bookingGnkId: {
    color: '#22d3ee',
    fontSize: 14,
    fontWeight: '900',
    fontFamily: 'monospace',
  },
  bookingPnr: {
    color: '#94a3b8',
    fontSize: 11,
    marginTop: 2,
  },
  statusConfirmed: {
    backgroundColor: '#064e3b',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusPending: {
    backgroundColor: '#78350f',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusTextConfirmed: {
    color: '#34d399',
    fontSize: 10,
    fontWeight: '800',
  },
  statusTextPending: {
    color: '#fbbf24',
    fontSize: 10,
    fontWeight: '800',
  },
  bookingTourTitle: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 6,
  },
  bookingInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  bookingInfoText: {
    color: '#64748b',
    fontSize: 11,
  },
  bookingFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
    paddingTop: 10,
  },
  bookingPrice: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '900',
  },
  voucherBtn: {
    backgroundColor: '#1e293b',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#06b6d4',
  },
  voucherBtnText: {
    color: '#22d3ee',
    fontSize: 11,
    fontWeight: '800',
  },
  txnItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    padding: 12,
    borderRadius: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  txnIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#1e293b',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  txnEmoji: {
    fontSize: 16,
  },
  txnBody: {
    flex: 1,
  },
  txnDesc: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  txnDate: {
    color: '#64748b',
    fontSize: 10,
    marginTop: 2,
  },
  txnRight: {
    alignItems: 'flex-end',
  },
  txnDebit: {
    color: '#f87171',
    fontWeight: '800',
    fontSize: 12,
  },
  txnCredit: {
    color: '#34d399',
    fontWeight: '800',
    fontSize: 12,
  },
  txnBal: {
    color: '#64748b',
    fontSize: 10,
    marginTop: 2,
  },
  profileCard: {
    backgroundColor: '#0f172a',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  profileAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#06b6d4',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  profileInitial: {
    fontSize: 24,
    fontWeight: '900',
    color: '#020617',
  },
  profileName: {
    fontSize: 18,
    fontWeight: '900',
    color: '#ffffff',
  },
  profileRole: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
  },
  approvedPill: {
    backgroundColor: '#064e3b',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 10,
  },
  approvedPillText: {
    color: '#34d399',
    fontSize: 11,
    fontWeight: '800',
  },
  infoCard: {
    backgroundColor: '#0f172a',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  infoCardTitle: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
    paddingBottom: 8,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  infoLabel: {
    color: '#64748b',
    fontSize: 11,
  },
  infoVal: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: '#0f172a',
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
    paddingVertical: 8,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
  },
  navIcon: {
    fontSize: 18,
    opacity: 0.5,
  },
  navIconActive: {
    opacity: 1,
  },
  navText: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 2,
    fontWeight: '700',
  },
  navTextActive: {
    color: '#22d3ee',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(2, 6, 23, 0.85)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#0f172a',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    borderWidth: 1,
    borderColor: '#334155',
  },
  topUpModalContent: {
    backgroundColor: '#0f172a',
    borderRadius: 24,
    margin: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  voucherModalCard: {
    backgroundColor: '#0f172a',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '92%',
    borderWidth: 1,
    borderColor: '#334155',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  modalTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '900',
  },
  closeBtnText: {
    color: '#94a3b8',
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalBody: {
    padding: 16,
  },
  voucherBody: {
    padding: 16,
  },
  modalTourName: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '900',
  },
  modalTourDest: {
    color: '#22d3ee',
    fontSize: 12,
    marginTop: 2,
    marginBottom: 14,
  },
  inputLabel: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 10,
    marginBottom: 6,
  },
  depOptions: {
    flexDirection: 'row',
    gap: 8,
  },
  depOptionCard: {
    flex: 1,
    backgroundColor: '#020617',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  depOptionCardActive: {
    borderColor: '#06b6d4',
    backgroundColor: '#083344',
  },
  depOptionDate: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },
  depOptionSeats: {
    color: '#34d399',
    fontSize: 10,
    marginTop: 2,
  },
  counterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#020617',
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  counterBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  counterBtnText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  counterVal: {
    flex: 1,
    textAlign: 'center',
    color: '#ffffff',
    fontWeight: '800',
  },
  modalInput: {
    backgroundColor: '#020617',
    color: '#ffffff',
    borderRadius: 12,
    padding: 12,
    fontSize: 13,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  priceSummaryBox: {
    backgroundColor: '#020617',
    borderRadius: 14,
    padding: 14,
    marginTop: 14,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  priceSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  priceSummaryLabel: {
    color: '#64748b',
    fontSize: 12,
  },
  priceSummaryTotal: {
    color: '#22d3ee',
    fontSize: 18,
    fontWeight: '900',
  },
  paymentMethodNote: {
    color: '#34d399',
    fontSize: 10,
    marginTop: 4,
  },
  confirmBookingBtn: {
    backgroundColor: '#06b6d4',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 20,
  },
  confirmBookingText: {
    color: '#020617',
    fontWeight: '900',
    fontSize: 14,
  },
  qrContainer: {
    flexDirection: 'row',
    backgroundColor: '#020617',
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    gap: 14,
    borderWidth: 1,
    borderColor: '#1e293b',
    marginBottom: 14,
  },
  qrMock: {
    width: 80,
    height: 80,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
  },
  qrMockIcon: {
    fontSize: 24,
  },
  qrMockCode: {
    color: '#020617',
    fontSize: 7,
    fontWeight: '900',
  },
  qrMockAuth: {
    color: '#020617',
    fontSize: 6,
    fontFamily: 'monospace',
  },
  pnrBadge: {
    flex: 1,
  },
  pnrLabel: {
    color: '#94a3b8',
    fontSize: 10,
    textTransform: 'uppercase',
  },
  pnrVal: {
    color: '#34d399',
    fontSize: 18,
    fontWeight: '900',
    fontFamily: 'monospace',
  },
  gnkIdSub: {
    color: '#22d3ee',
    fontSize: 11,
    fontFamily: 'monospace',
    marginTop: 2,
  },
  voucherTourTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '900',
    marginBottom: 10,
  },
  voucherDetailsGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  voucherGridItem: {
    flex: 1,
    backgroundColor: '#020617',
    padding: 10,
    borderRadius: 10,
  },
  voucherGridLabel: {
    color: '#64748b',
    fontSize: 10,
  },
  voucherGridVal: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
    marginTop: 2,
  },
  passengerList: {
    backgroundColor: '#020617',
    padding: 12,
    borderRadius: 12,
    marginBottom: 14,
  },
  passengerListTitle: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '800',
    marginBottom: 8,
  },
  passengerItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  passengerName: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  passengerPassport: {
    color: '#22d3ee',
    fontSize: 11,
    fontFamily: 'monospace',
  },
  voucherHelpBox: {
    backgroundColor: '#020617',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  helpTitle: {
    color: '#fbbf24',
    fontSize: 11,
    fontWeight: '800',
    marginBottom: 4,
  },
  helpDesc: {
    color: '#94a3b8',
    fontSize: 10,
    lineHeight: 14,
  },
  bankDetailCard: {
    backgroundColor: '#020617',
    padding: 12,
    borderRadius: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  bankName: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },
  bankIban: {
    color: '#22d3ee',
    fontSize: 11,
    fontFamily: 'monospace',
    marginTop: 2,
  },
  bankTitle: {
    color: '#94a3b8',
    fontSize: 10,
    marginTop: 2,
  },
  cyanText: {
    color: '#22d3ee',
  },
  emeraldText: {
    color: '#34d399',
  },
  whiteText: {
    color: '#ffffff',
  },
});
