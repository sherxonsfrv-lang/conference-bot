import React from 'react';
import NetworkBrowser from '../components/NetworkBrowser';

const NetworkingView = ({ onBack, accessPhase, onOpenPayment, onViewProfile, showToast }) => (
  <NetworkBrowser 
    onBack={onBack} 
    accessPhase={accessPhase} 
    onOpenPayment={onOpenPayment} 
    onViewProfile={onViewProfile}
    showToast={showToast}
  />
);

export default NetworkingView;
