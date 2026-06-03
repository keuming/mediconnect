import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { C } from '../../components/UI';

export default function HistoriqueScreen({ navigation }) {
  return (
    <SafeAreaView style={{ flex:1, backgroundColor:C.bg }}>
      <View style={{ paddingHorizontal:20, paddingTop:16, paddingBottom:14, borderBottomWidth:1, borderBottomColor:C.border, flexDirection:'row', alignItems:'center', gap:12 }}>
        {navigation?.goBack && (
          <TouchableOpacity onPress={navigation.goBack} hitSlop={{ top:10, bottom:10, left:10, right:10 }}>
            <Text style={{ fontSize:22, color:C.muted }}>{'<-'}</Text>
          </TouchableOpacity>
        )}
        <Text style={{ fontSize:17, fontWeight:'800', color:C.text }}>Historique livraisons</Text>
      </View>
      <ScrollView contentContainerStyle={{ padding:24, flexGrow:1, alignItems:'center', justifyContent:'center' }}>
        <Text style={{ fontSize:48, marginBottom:16 }}>"[App]"</Text>
        <Text style={{ fontSize:18, fontWeight:'700', color:C.text, marginBottom:10, textAlign:'center' }}>Historique livraisons</Text>
        <Text style={{ fontSize:14, color:C.muted, textAlign:'center', lineHeight:22, marginBottom:24 }}>
          Fonctionnalite disponible sur la version web
        </Text>
        <View style={{ backgroundColor:'rgba(10,143,88,.1)', borderRadius:12, padding:16, borderWidth:1, borderColor:'rgba(10,143,88,.25)', width:'100%' }}>
          <Text style={{ fontSize:13, color:'rgba(74,222,128,.8)', textAlign:'center', lineHeight:20 }}>
            Accedez a toutes les fonctionnalites sur
          </Text>
          <TouchableOpacity onPress={() => Linking.openURL('https://mediconnect4africa.cloud')}>
            <Text style={{ fontSize:14, fontWeight:'800', color:'#4ade80', textAlign:'center', marginTop:6 }}>
              mediconnect4africa.cloud
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
