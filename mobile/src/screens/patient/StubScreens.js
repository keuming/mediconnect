import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { C } from '../../components/UI';

function GenericStub({ navigation, title, icon }) {
  return (
    <SafeAreaView style={{ flex:1, backgroundColor:C.bg }}>
      <View style={{ paddingHorizontal:20, paddingTop:16, paddingBottom:14, borderBottomWidth:1, borderBottomColor:C.border, flexDirection:'row', alignItems:'center', gap:12 }}>
        {navigation?.goBack && (
          <TouchableOpacity onPress={navigation.goBack} hitSlop={{ top:10, bottom:10, left:10, right:10 }}>
            <Text style={{ fontSize:22, color:C.muted }}>←</Text>
          </TouchableOpacity>
        )}
        <Text style={{ fontSize:17, fontWeight:'800', color:C.text }}>{title}</Text>
      </View>
      <ScrollView contentContainerStyle={{ padding:24, flexGrow:1, alignItems:'center', justifyContent:'center' }}>
        <Text style={{ fontSize:48, marginBottom:16 }}>{icon}</Text>
        <Text style={{ fontSize:18, fontWeight:'700', color:C.text, marginBottom:10, textAlign:'center' }}>{title}</Text>
        <Text style={{ fontSize:14, color:C.muted, textAlign:'center', lineHeight:22, marginBottom:24 }}>
          Bientot disponible sur l'application mobile
        </Text>
        <View style={{ backgroundColor:'rgba(10,143,88,.1)', borderRadius:12, padding:16, borderWidth:1, borderColor:'rgba(10,143,88,.25)', width:'100%' }}>
          <Text style={{ fontSize:13, color:'rgba(74,222,128,.8)', textAlign:'center', lineHeight:20 }}>
            En attendant, accedez a cette fonctionnalite sur
          </Text>
          <TouchableOpacity onPress={() => Linking.openURL('https://manager.mediconnect4africa.cloud/patient')}>
            <Text style={{ fontSize:14, fontWeight:'800', color:'#4ade80', textAlign:'center', marginTop:6 }}>
              manager.mediconnect4africa.cloud
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

export function MedecinsPrivesScreen({ navigation }) {
  return <GenericStub navigation={navigation} title="Medecins Independants" icon="⭐" />;
}
export function CliniquesScreen({ navigation }) {
  return <GenericStub navigation={navigation} title="Trouver une clinique" icon="🔍" />;
}
export function AssurancesScreen({ navigation }) {
  return <GenericStub navigation={navigation} title="Mes assurances" icon="🛡️" />;
}
export function FacturesScreen({ navigation }) {
  return <GenericStub navigation={navigation} title="Mes factures" icon="🧾" />;
}
export function AbonnementScreen({ navigation }) {
  return <GenericStub navigation={navigation} title="Mon abonnement" icon="💰" />;
}
