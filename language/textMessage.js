"use strict";
var config = require("../config/config");
var environment = config.app.environmentURL;
module.exports = {
  compeleteProfileOnlySignup: {
    english: `%DBA% Do us a favor and Complete your profile so we can send you more coupons! Click here: ${environment}customers.taplocalmarketing.com/complete_profile.php?id=%CUSTOMER_ID%&mid=%MERCHANT_ID% to complete your profile. Reply HELP for Help.  Reply STOP to Cancel`,
    spanish: `%DBA% Haganos un Favor y complete su Perfil!  Click aqui: ${environment}customers.taplocalmarketing.com/complete_profile.php?id=%CUSTOMER_ID%&mid=%MERCHANT_ID% para completar su perfil. Envie HELP para ayuda o STOP para cancelar.`
  },
  AllOptOut: {
    english: `TapLocal Text SMS Coupons and Promotions.  You have opted out.  You will not receive additional messages.`,
    spanish: `TapLocal Text Cupones y Promociones por texto. Ud decidio no participar. No recibira mas mensajes.`
  },
  merchantOptOut: {
    english: `%DBA% Coupons and Promotions.  You have opted out.  You will not receive additional messages.`,
    spanish: `%DBA%  Cupones y Promociones por texto. Ud decidio no participar. No recibira mas mensajes.`
  },
  invalidText: {
    english: `TAPLocal Text: This is not a valid text For Help please call 844-899-8559 or email support@taplocalmarketing.com. Msg&data rates may apply. Reply stop to cancel`,
    spanish: `Texto TAPLocal: Lo sentimos, no reconocemos su mensaje. Envie HELP para ayuda o STOP para cancelar`
  },
  helpText: {
    english: `TapLocal Text SMS Coupons & Promotions.  For help please call 844-899-8559 or email support@taplocalmarketing.com Msg&Data rates may apply. Reply STOP to cancel.`,
    spanish: `TapLocal Text Cupones y Promociones por texto. Para ayuda, llame 787-991-7323 o por email smssupport@taplocalpr.com. Cargos por msgs/data pueden aplicar. Envie STOP para cancelar.`
  },
  merchantHelpText: {
    english: `%DBA% SMS Coupons & Promotions.  For help please call 844-899-8559 or email support@taplocalmarketing.com Msg&Data rates may apply. Reply STOP to cancel.`,
    spanish: `%DBA%  Cupones y Promociones por texto. Para ayuda, llame 787-991-7323 o por email smssupport@taplocalpr.com. Cargos por msgs/data pueden aplicar. Envie STOP para cancelar.`
  },
  giveCoupon: {
    english: `%DBA%. Hey! We value you as one of our favorite customers! Here's a coupon for %REWARD_TEXT% ${environment}customers.taplocalmarketing.com/coupon.php?id=%COUPON_ID% Reply HELP for help.  Reply STOP to cancel.`,
    spanish: `%DBA%. Saludos, lo valoramos como uno de nuestros clientes predilectos! Le enviamos un cupon de %SPANISH_REWARD_TEXT% ${environment}customers.taplocalmarketing.com/coupon.php?id=%COUPON_ID%  Envie HELP para ayuda o STOP para cancelar.`
  },
  giveCouponWithShortUrl: {
    english: `%DBA%. Hey! We value you as one of our favorite customers! Here's a coupon for %REWARD_TEXT% %SHORTURL% Reply HELP for help.  Reply STOP to cancel.`,
    spanish: `%DBA%. Saludos, lo valoramos como uno de nuestros clientes predilectos! Le enviamos un cupon de %SPANISH_REWARD_TEXT% %SHORTURL%  Envie HELP para ayuda o STOP para cancelar.`
  },
  giveCustomCoupon: {
    english: `%DBA%. Hey! We value you as one of our favorite customers! Here's a coupon for  %REWARD_TEXT% %URL% Reply HELP for help.  Reply STOP to cancel.`,
    spanish: `%DBA%. Saludos, lo valoramos como uno de nuestros clientes predilectos! Le enviamos un cupon de  %SPANISH_REWARD_TEXT% %URL%  Envie HELP para ayuda o STOP para cancelar.`
  },
  CustomCouponURLs: {
    urls: `${environment}customers.taplocalmarketing.com/coupon.php?id=`
  },
  reviewGenertionMessage: {
    english: `Hi there! Thanks for visiting %DBA%. Please click here to let us know how we're doing! %LINK%`,
    spanish: `%DBA% Hey! Dejenos saber sobre su experiencia atravez de el siguiente enlace. %LINK%`
  },
  OptInSMS: {
    english: `%DBA% You've opted to recurring SMS msgs. Msg&data rates may apply. Up to %FREQUENCY% msg/mo. Reply HELP for help STOP to stop. Click for T&C %TERMS_LINK%`,
    spanish: `%DBA% Se suscrito a recibir cupones SMS recurrentes.  Msg&data rates may apply. Up to %FREQUENCY% msg/mo. Reply HELP for help STOP to stop. Click for T&C %TERMS_LINK%.`
  },
  compeleteProfileOnly: {
    english: `%DBA%. Complete your profile for more coupons! Click: %LINK% to complete your profile. Reply HELP for Help.  Reply STOP to Cancel`,
    spanish: `%DBA% Complete su perfil para poder enviarle mas cupones! Click here: %LINK%  Reply HELP for Help.  Reply STOP to Cancel`
  },
  compeleteProfileWithReward: {
    english: `%DBA%. Thanks for Joining! Click: %LINK% to complete your profile and receive a coupon via SMS. Reply HELP for help. Reply STOP to stop.`,
    spanish: `%DBA% Gracias por suscribirse, complete su perfil y reciba un cupon! Click: %LINK% Reply HELP for help. Reply STOP to stop.`
  },
  adminBillingNotification: {
    english: `Successfully changed SMS text limit, below are the changes:- NEW TIER: %TIER%, Segment: %SEGEMENT%`,
    spanish: `Ha cambiado exitosamente su limite de textos, que se muestran a continuacion:- NEW TIER: %TIER%, Segment: %SEGEMENT%`
  },
  merchantBillingNotification: {
    english: `You've successfully changed your SMS text limit, below are the changes:- NEW TIER: %TIER%, Segment: %SEGEMENT%`,
    spanish: `Ha cambiado exitosamente su limite de textos, que se muestran a continuacion:- NEW TIER: %TIER%, Segment: %SEGEMENT%`
  },
  merchantDowngradeBillingNotification: {
    english: `You've downgraded your SMS text limit, below are the changes:- NEW TIER: %TIER%, Segment: %SEGEMENT%`,
    spanish: `Degradación de su límite de texto SMS, a continuación se muestran los cambios:- NEW TIER: %TIER%, Segment: %SEGEMENT%`
  },
  smsReachingToExceedLimit: {
    english: `You are about to exceed the limit of your SMS .You are left with %percentage% of your SMS.`,
    spanish: `Está a punto de exceder el límite de sus SMS. Te quedan con el %percentage% de tus SMS.`
  },
  comeBackOfferWithShortUrl: {
    english: `%DBA%. Hey!  We miss you! Come say hello! Here's %REWARD_TEXT%. %SHORTURL% Reply HELP for help.  Reply STOP to cancel.`,
    spanish: `%DBA%. Saludos, queremos saber de Ud! Le enviamos un %SPANISH_REWARD_TEXT%. %SHORTURL% Envie HELP para ayuda o STOP para cancelar.`
  },
  happyBirthdayOfferWithShortUrl: {
    english: `%DBA%. Hey! Happy Birthday! Let us treat you to %REWARD_TEXT%. %SHORTURL% Reply HELP for help.  Reply STOP to cancel.`,
    spanish: `%DBA%. Muchas felicidades! Este regalo es para Ud %SPANISH_REWARD_TEXT%. %SHORTURL% Envie HELP para ayuda o STOP para cancelar.`
  },
  customOfferWithShortUrl: {
    english: `%DBA%. Hey! We value you as one of our favorite customers! Here's a coupon for %REWARD_TEXT%. %SHORTURL% Reply HELP for help.  Reply STOP to cancel.`,
    spanish: `%DBA%. Saludos, lo valoramos como uno de nuestros clientes predilectos! Le enviamos un cupon de %SPANISH_REWARD_TEXT%. %SHORTURL% Envie HELP para ayuda o STOP para cancelar.`
  },
  customerTypeOfferWithShortUrl: {
    english: `%DBA%. Hey!  For being a %OFFER_NAME%. Here's a coupon for %REWARD_TEXT%. %SHORTURL% Reply HELP for help.  Reply STOP to cancel.`,
    spanish: `%DBA%. Por ser un %OFFER_NAME% le enviamos un cupon de %SPANISH_REWARD_TEXT%. %SHORTURL% Envie HELP para ayuda o STOP para cancelar.`
  },
  topSpentOfferWithShortUrl: {
    english: `%DBA%. Thank you for your recent purchase! Here's a coupon for %REWARD_TEXT%. %SHORTURL% Reply HELP for help.  Reply STOP to cancel.`,
    spanish: `%DBA%. Gracias por su reciente compra! Le enviamos un cupon de %SPANISH_REWARD_TEXT%. %SHORTURL% Envie HELP para ayuda o STOP para cancelar.`
  },
  profileCompleteOfferWithShortUrl: {
    english: `%DBA%. Thanks for completing your profile! Here's a coupon for %REWARD_TEXT%. %SHORTURL% Reply HELP for help. Reply STOP to cancel.`,
    spanish: `%DBA%. Gracias por completar su perfil! Le enviamos un cupon de %SPANISH_REWARD_TEXT%. %SHORTURL% Envie HELP para ayuda o STOP para cancelar.`
  },
  punchCardOfferWithShortUrl: {
    english: `%DBA%. You earned a full punchcard!  Here's a coupon for %REWARD_TEXT%. %SHORTURL% Reply HELP for help.  Reply STOP to cancel.`,
    spanish: `%DBA%. Ud se gano una tarjeta con ponches completos! Le enviamos un cupon %SPANISH_REWARD_TEXT%. %SHORTURL% Envie HELP para ayuda o STOP para cancelar.`
  }
};
