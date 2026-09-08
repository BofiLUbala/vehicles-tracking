import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../shared/widgets/app_text_field.dart';
import '../../../shared/widgets/big_button.dart';
import '../../missions/application/missions_providers.dart';
import '../application/fuel_flow_notifier.dart';
import '../application/fuel_form_validators.dart';
import '../data/models/fuel_type.dart';

/// Écran 12 — Déclaration d'un plein de carburant, étape 1 (formulaire).
///
/// Le véhicule est pré-rempli depuis l'affectation courante du chauffeur
/// (véhicule de sa mission active du jour, comme pour le suivi GPS — voir
/// `missionTrackingControllerProvider`), mais reste modifiable : un chauffeur
/// peut déclarer un plein en dehors d'une mission active.
class FuelFormScreen extends ConsumerStatefulWidget {
  const FuelFormScreen({super.key});

  @override
  ConsumerState<FuelFormScreen> createState() => _FuelFormScreenState();
}

class _FuelFormScreenState extends ConsumerState<FuelFormScreen> {
  final _vehicleController = TextEditingController();
  final _litersController = TextEditingController();
  final _totalCostController = TextEditingController();
  final _odometerController = TextEditingController();
  final _stationController = TextEditingController();
  FuelType _fuelType = FuelType.diesel;

  String? _vehicleError;
  String? _litersError;
  String? _totalCostError;
  String? _odometerError;

  bool _prefilled = false;

  @override
  void dispose() {
    _vehicleController.dispose();
    _litersController.dispose();
    _totalCostController.dispose();
    _odometerController.dispose();
    _stationController.dispose();
    super.dispose();
  }

  void _prefillVehicleIfNeeded(String? vehicleId) {
    if (_prefilled || vehicleId == null || vehicleId.isEmpty) return;
    _prefilled = true;
    _vehicleController.text = vehicleId;
  }

  void _submit() {
    final vehicleError = validateVehicleId(_vehicleController.text);
    final litersError = validateLiters(_litersController.text);
    final totalCostError = validateTotalCost(_totalCostController.text);
    final odometerError = validateOdometer(_odometerController.text);

    setState(() {
      _vehicleError = vehicleError;
      _litersError = litersError;
      _totalCostError = totalCostError;
      _odometerError = odometerError;
    });

    if (vehicleError != null ||
        litersError != null ||
        totalCostError != null ||
        odometerError != null) {
      return;
    }

    final vehicleId = _vehicleController.text.trim();
    final liters = double.parse(_litersController.text.trim().replaceAll(',', '.'));
    final totalCost =
        double.parse(_totalCostController.text.trim().replaceAll(',', '.'));
    final odometer =
        double.parse(_odometerController.text.trim().replaceAll(',', '.'));
    final stationName = _stationController.text.trim();

    ref.read(fuelFlowProvider(vehicleId).notifier).onFormSubmitted(
          vehicleId: vehicleId,
          liters: liters,
          totalCost: totalCost,
          odometer: odometer,
          fuelType: _fuelType,
          stationName: stationName.isEmpty ? null : stationName,
        );

    context.push('/fuel/$vehicleId/receipt-photo');
  }

  @override
  Widget build(BuildContext context) {
    final missionsAsync = ref.watch(todayMissionsProvider);
    final assignedVehicleId = missionsAsync.maybeWhen(
      data: (missions) {
        for (final mission in missions) {
          if (mission.isTrackable && mission.vehicleId != null) {
            return mission.vehicleId;
          }
        }
        for (final mission in missions) {
          if (mission.vehicleId != null) return mission.vehicleId;
        }
        return null;
      },
      orElse: () => null,
    );
    _prefillVehicleIfNeeded(assignedVehicleId);

    return Scaffold(
      appBar: AppBar(title: const Text('Déclarer un plein')),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              AppTextField(
                label: 'Véhicule',
                controller: _vehicleController,
                hintText: 'Identifiant du véhicule (pré-rempli automatiquement)',
                errorText: _vehicleError,
              ),
              const SizedBox(height: 20),
              AppTextField(
                label: 'Quantité (litres)',
                controller: _litersController,
                keyboardType: const TextInputType.numberWithOptions(decimal: true),
                hintText: 'Ex : 45.5',
                errorText: _litersError,
              ),
              const SizedBox(height: 20),
              AppTextField(
                label: 'Coût total',
                controller: _totalCostController,
                keyboardType: const TextInputType.numberWithOptions(decimal: true),
                hintText: 'Ex : 65000',
                errorText: _totalCostError,
              ),
              const SizedBox(height: 20),
              AppTextField(
                label: 'Kilométrage (compteur)',
                controller: _odometerController,
                keyboardType: const TextInputType.numberWithOptions(decimal: true),
                hintText: 'Ex : 128900',
                errorText: _odometerError,
              ),
              const SizedBox(height: 20),
              Text('Type de carburant', style: Theme.of(context).textTheme.titleMedium),
              const SizedBox(height: 8),
              DropdownButtonFormField<FuelType>(
                initialValue: _fuelType,
                items: FuelType.values
                    .map((t) => DropdownMenuItem(value: t, child: Text(t.label)))
                    .toList(),
                onChanged: (value) {
                  if (value != null) setState(() => _fuelType = value);
                },
              ),
              const SizedBox(height: 20),
              AppTextField(
                label: 'Station-service (optionnel)',
                controller: _stationController,
                hintText: 'Nom de la station',
              ),
              const SizedBox(height: 32),
              BigButton(
                label: 'Continuer — Photo du reçu',
                icon: Icons.arrow_forward,
                onPressed: _submit,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
