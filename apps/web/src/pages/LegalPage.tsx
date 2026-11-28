import { Link, useParams } from '@tanstack/react-router'
import { ArrowLeft, ShieldCheck, FileText, Settings2 } from 'lucide-react'
import { Card } from '../components/ui/Card'

type DocumentKey = 'confidentialite' | 'utilisation' | 'gestion'

const documents: Record<DocumentKey, { title: string; intro: string; sections: Array<{ heading: string; body: string[] }> }> = {
  confidentialite: {
    title: 'Politique de confidentialité',
    intro: 'Cette politique explique comment 2iE Market utilise les informations nécessaires au fonctionnement de la marketplace.',
    sections: [
      { heading: 'Données collectées', body: ['Lors de l’inscription et de l’utilisation du service, la plateforme peut traiter vos nom et prénom, adresse e-mail, numéro de téléphone, informations de localisation sur le campus, informations de boutique, annonces, commandes, avis, notifications et justificatifs transmis volontairement.', 'Les données techniques nécessaires à la sécurité et au diagnostic du service peuvent également être traitées. Ne transmettez pas de données sensibles qui ne sont pas nécessaires à une commande ou à votre compte.'] },
      { heading: 'Finalités', body: ['Ces informations servent à créer et sécuriser les comptes, afficher les boutiques et annonces, transmettre les commandes aux vendeurs, permettre le suivi des commandes, gérer les abonnements vendeurs, traiter les signalements et assurer l’administration de la plateforme.', 'Les coordonnées nécessaires à l’exécution d’une commande sont communiquées au vendeur concerné. Elles ne doivent pas être utilisées à d’autres fins que le traitement de cette commande.'] },
      { heading: 'Accès et partage', body: ['L’accès aux données est limité aux personnes qui en ont besoin pour exploiter le service : l’utilisateur concerné, le vendeur impliqué dans une commande et les administrateurs habilités. Des prestataires techniques d’hébergement, de stockage ou d’infrastructure peuvent traiter certaines données pour fournir le service.', '2iE Market ne vend pas les données personnelles des utilisateurs.'] },
      { heading: 'Conservation et sécurité', body: ['Les données sont conservées pendant la durée nécessaire au fonctionnement du compte, au suivi des commandes, à la prévention des abus et au respect des obligations applicables. Certains éléments d’historique peuvent être conservés après la fermeture d’un compte lorsqu’ils sont nécessaires à la traçabilité ou à la gestion des litiges.', 'Des mesures techniques et organisationnelles sont mises en œuvre pour limiter les accès non autorisés. Aucun service en ligne ne peut toutefois garantir une sécurité absolue.'] },
      { heading: 'Vos demandes', body: ['Vous pouvez demander l’accès, la rectification ou la suppression/anonymisation de vos données, sous réserve des données qui doivent être conservées pour des motifs légitimes ou légaux. Adressez votre demande au canal de contact ou d’assistance indiqué sur la plateforme.', 'La présente politique doit être complétée par les coordonnées officielles du responsable du traitement et, avant exploitation commerciale, validée au regard des textes applicables au Burkina Faso.'] },
    ],
  },
  utilisation: {
    title: 'Règles d’utilisation',
    intro: 'En utilisant 2iE Market, chaque membre s’engage à respecter les règles suivantes.',
    sections: [
      { heading: 'Compte et identité', body: ['Fournissez des informations exactes, gardez vos identifiants confidentiels et signalez toute utilisation non autorisée de votre compte. Un compte est personnel et ne doit pas être prêté ou vendu.', 'Vous êtes responsable des actions réalisées depuis votre compte, sauf utilisation frauduleuse signalée et établie.'] },
      { heading: 'Annonces et contenus', body: ['Publiez uniquement des produits et services que vous êtes autorisé à proposer. Les descriptions, prix, photos, disponibilités et conditions doivent être exacts et ne pas induire les acheteurs en erreur.', 'Sont interdits les contenus illicites, frauduleux, contrefaits, dangereux, discriminatoires, harcelants ou portant atteinte aux droits d’autrui. Les administrateurs peuvent masquer ou archiver une annonce signalée ou non conforme.'] },
      { heading: 'Commandes', body: ['Une commande transmise à un vendeur est considérée comme acceptée par défaut. Le vendeur peut l’annuler à tout moment depuis son espace ; il doit tenir le client informé et honorer les engagements qu’il n’a pas annulés.', 'Le client doit fournir des coordonnées exactes et rester joignable pour organiser la remise ou le rendez-vous. Les utilisateurs doivent résoudre leurs échanges de bonne foi.'] },
      { heading: 'Responsabilité des membres', body: ['Les vendeurs sont responsables de la conformité, de la qualité, de la disponibilité et de la remise de leurs produits ou services. Les acheteurs sont responsables de vérifier les informations utiles avant de commander.', '2iE Market fournit un outil de mise en relation et de gestion. Sauf indication contractuelle expresse, la plateforme n’est ni le vendeur, ni le fabricant, ni le transporteur et ne garantit pas l’exécution d’une transaction entre membres.'] },
      { heading: 'Mesures en cas de manquement', body: ['En cas de fraude, d’abus, de contenu interdit ou de risque pour les membres, la plateforme peut retirer une annonce, suspendre temporairement un compte, désactiver une boutique ou procéder à la suppression/anonymisation d’un compte, avec une mesure proportionnée à la situation.', 'Les utilisateurs peuvent signaler un contenu ou une activité depuis les fonctions prévues à cet effet.'] },
    ],
  },
  gestion: {
    title: 'Politique de gestion et d’autorisation',
    intro: 'Ce document décrit les rôles, les validations et les pouvoirs de gestion appliqués sur 2iE Market.',
    sections: [
      { heading: 'Comptes clients', body: ['Un compte client permet de consulter les annonces, gérer un panier, passer des commandes, suivre leur statut et publier un avis lorsque cette fonction est disponible.'] },
      { heading: 'Comptes vendeurs et boutiques', body: ['La création d’un compte vendeur crée une demande de boutique qui reste en attente jusqu’à validation administrative. La boutique n’est rendue publique qu’après approbation et activation du compte.', 'Les frais d’ouverture vendeur sont affichés au moment de l’inscription. Le renouvellement de l’abonnement vendeur est fixé à 1 000 FCFA par mois ; la preuve de paiement est soumise à l’administration pour vérification. Le vendeur reste responsable de ses annonces, de son stock, de ses prix et du traitement de ses commandes.'] },
      { heading: 'Pouvoirs de l’administration', body: ['Les administrateurs habilités peuvent examiner les demandes vendeurs et justificatifs, approuver ou refuser une boutique, gérer les catégories, modérer les annonces et signalements, suspendre ou réactiver un compte non administrateur et supprimer/anonymiser un compte utilisateur.', 'Les comptes administrateurs sont protégés contre la suppression et la modification de rôle depuis les fonctions ordinaires de gestion des membres. Les actions sensibles sont journalisées lorsque le système le permet.'] },
      { heading: 'Autorisations et limites', body: ['Un vendeur ne peut gérer que sa propre boutique, ses annonces, ses commandes et ses justificatifs. Un client ne peut consulter que les informations publiques et celles liées à ses propres commandes. Les administrateurs accèdent aux fonctions de gestion selon leurs habilitations.', 'L’approbation d’une boutique autorise son activation sur la plateforme ; elle ne constitue pas une certification de la qualité des produits, ni une garantie financière ou commerciale donnée par 2iE Market.'] },
      { heading: 'Évolution du document', body: ['Les règles peuvent être mises à jour pour des raisons opérationnelles, de sécurité ou de conformité. La version applicable et la date d’acceptation sont enregistrées lors de l’inscription. En cas de modification substantielle, la plateforme devra demander une nouvelle acceptation avant de poursuivre les usages concernés.'] },
    ],
  },
}

export default function LegalPage() {
  const { document } = useParams({ from: '/legal/$document' })
  const key = document as DocumentKey
  const item = documents[key]
  if (!item) {
    return <main className="container-premium py-12"><Card className="p-6"><h1 className="text-xl font-extrabold">Document introuvable</h1><Link to="/inscription" className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-brand-700"><ArrowLeft className="h-4 w-4" /> Retour à l’inscription</Link></Card></main>
  }
  const Icon = key === 'confidentialite' ? ShieldCheck : key === 'utilisation' ? FileText : Settings2
  return (
    <main className="min-h-screen bg-canvas py-10 sm:py-14">
      <div className="container-premium max-w-4xl">
        <Link to="/inscription" className="inline-flex items-center gap-2 text-sm font-bold text-brand-700 hover:underline"><ArrowLeft className="h-4 w-4" /> Retour à l’inscription</Link>
        <Card className="mt-6 p-6 sm:p-9">
          <div className="flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-50 text-brand-700"><Icon className="h-5 w-5" /></span><div><p className="text-[10px] font-extrabold uppercase tracking-widest text-brand-700">2iE Market · Version 28 novembre 2026</p><h1 className="mt-1 text-2xl font-black text-brand-950 sm:text-3xl">{item.title}</h1></div></div>
          <p className="mt-5 text-sm leading-relaxed text-ink-muted">{item.intro}</p>
          <div className="mt-8 space-y-7">{item.sections.map((section) => <section key={section.heading}><h2 className="text-base font-extrabold text-ink">{section.heading}</h2><div className="mt-2 space-y-2">{section.body.map((paragraph) => <p key={paragraph} className="text-sm leading-7 text-ink-muted">{paragraph}</p>)}</div></section>)}</div>
          <div className="mt-8 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs leading-relaxed text-amber-900">Document de référence opérationnel rédigé pour la plateforme. Il doit être relu et complété par le responsable juridique, notamment avec l’identité et les coordonnées du responsable du traitement, avant une mise en conformité définitive.</div>
        </Card>
      </div>
    </main>
  )
}
