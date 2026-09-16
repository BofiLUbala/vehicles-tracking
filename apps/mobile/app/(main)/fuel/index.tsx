import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../../src/context/AuthContext';
import { AppTextField } from '../../../src/components/AppTextField';
import { BigButton } from '../../../src/components/BigButton';
import { FuelType } from '../../../src/types/fuel.types';
import { AppTheme } from '../../../src/theme/colors';

const FUEL_TYPES: { label: string; value: FuelType }[] = [
  { label: 'Diesel / Gasoil', value: 'DIESEL' },
  { label: 'Essence', value: 'PETROL' },
  { label: 'Électrique', value: 'ELECTRIC' },
  { label: 'Autre', value: 'OTHER' },
];

export default function FuelFormScreen() {
  const { driver } = useAuth();
  const [vehicleId, setVehicleId] = useState(driver?.currentVehicleId || '');
  const [liters, setLiters] = useState('');
  const [totalCost, setTotalCost] = useState('');
  const [odometer, setOdometer] = useState('');
  const [fuelType, setFuelType] = useState<FuelType>('DIESEL');
  const [stationName, setStationName] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const router = useRouter();

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!vehicleId.trim()) errs.vehicleId = 'Le véhicule est obligatoire.';
    if (!liters.trim() || Number(liters) <= 0) errs.liters = 'Indiquez un volume valide (en litres).';
    if (!totalCost.trim() || Number(totalCost) <= 0) errs.totalCost = 'Indiquez le coût total.';
    if (!odometer.trim() || Number(odometer) <= 0) errs.odometer = 'Indiquez le kilométrage au compteur.';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleNext = () => {
    if (!validate()) return;

    router.push({
      pathname: `/(main)/fuel/${vehicleId}/receipt-photo`,
      params: {
        liters,
        totalCost,
        odometer,
        fuelType,
        stationName,
      },
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.container}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backText}>← Retour</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Déclaration Carburant</Text>
          <View style={{ width: 60 }} />
        </View>

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.subtitle}>
            Renseignez les détails du plein effectué avant de photographier le reçu et le compteur.
          </Text>

          <AppTextField
            label="Identifiant / Plaque du véhicule"
            placeholder="Ex: AA-123-BB"
            value={vehicleId}
            onChangeText={setVehicleId}
            error={errors.vehicleId}
          />

          <View style={styles.row}>
            <View style={styles.halfCol}>
              <AppTextField
                label="Volume (Litres)"
                placeholder="Ex: 85.5"
                keyboardType="numeric"
                value={liters}
                onChangeText={setLiters}
                error={errors.liters}
              />
            </View>
            <View style={styles.halfCol}>
              <AppTextField
                label="Coût Total"
                placeholder="Ex: 250000"
                keyboardType="numeric"
                value={totalCost}
                onChangeText={setTotalCost}
                error={errors.totalCost}
              />
            </View>
          </View>

          <AppTextField
            label="Kilométrage au compteur (km)"
            placeholder="Ex: 142350"
            keyboardType="numeric"
            value={odometer}
            onChangeText={setOdometer}
            error={errors.odometer}
          />

          <Text style={styles.inputLabel}>Type de carburant</Text>
          <View style={styles.fuelTypeGrid}>
            {FUEL_TYPES.map((ft) => {
              const isSelected = fuelType === ft.value;
              return (
                <TouchableOpacity
                  key={ft.value}
                  activeOpacity={0.8}
                  onPress={() => setFuelType(ft.value)}
                  style={[styles.fuelTypeBtn, isSelected ? styles.fuelTypeBtnActive : null]}
                >
                  <Text style={[styles.fuelTypeText, isSelected ? styles.fuelTypeTextActive : null]}>
                    {ft.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <AppTextField
            label="Nom de la station (Optionnel)"
            placeholder="Ex: TotalEnergies Limete"
            value={stationName}
            onChangeText={setStationName}
          />

          <BigButton
            label="Photographier le reçu →"
            onPressed={handleNext}
            style={styles.nextBtn}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backBtn: {
    paddingVertical: 4,
    paddingRight: 8,
  },
  backText: {
    fontSize: 14,
    fontWeight: '700',
    color: AppTheme.primary,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: AppTheme.text,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  subtitle: {
    fontSize: 14,
    color: AppTheme.textSecondary,
    lineHeight: 20,
    marginBottom: 20,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfCol: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: AppTheme.text,
    marginBottom: 8,
  },
  fuelTypeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  fuelTypeBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },
  fuelTypeBtnActive: {
    backgroundColor: AppTheme.primaryLight,
    borderColor: AppTheme.primary,
  },
  fuelTypeText: {
    fontSize: 13,
    fontWeight: '700',
    color: AppTheme.textSecondary,
  },
  fuelTypeTextActive: {
    color: AppTheme.primaryDark,
  },
  nextBtn: {
    marginTop: 16,
  },
});
