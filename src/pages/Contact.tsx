import { useState } from "react";
import { motion } from "framer-motion";
import { Header } from "@/components/layout/Header";
import { BackgroundVideo } from "@/components/ui/BackgroundVideo";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Mail,
  Phone,
  MapPin,
  Send,
  MessageSquare,
  Building,
  GraduationCap,
  User,
  Loader2,
  CheckCircle,
} from "lucide-react";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

const contactReasons = [
  { id: "general", label: "General Inquiry", icon: MessageSquare },
  { id: "employer", label: "Employer Partnership", icon: Building },
  { id: "school", label: "School Partnership", icon: GraduationCap },
  { id: "candidate", label: "Candidate Support", icon: User },
];

const contactInfo = [
  {
    icon: Mail,
    label: "Email",
    value: "hello@the3rdacademy.com",
    href: "mailto:hello@the3rdacademy.com",
  },
  {
    icon: Phone,
    label: "Phone",
    value: "+1 (555) 123-4567",
    href: "tel:+15551234567",
  },
  {
    icon: MapPin,
    label: "Headquarters",
    value: "San Francisco, CA",
    href: "#",
  },
];

const Contact = () => {
  const [selectedReason, setSelectedReason] = useState("general");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    organization: "",
    message: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Simulate form submission
    await new Promise((resolve) => setTimeout(resolve, 1500));

    setIsSubmitting(false);
    setIsSubmitted(true);
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <BackgroundVideo />
      <Header />

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-indigo-950/50 via-black to-black" />
        <motion.div
          className="absolute top-20 right-20 w-96 h-96 bg-indigo-900 rounded-full opacity-20 blur-3xl"
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute bottom-20 left-20 w-80 h-80 bg-purple-900 rounded-full opacity-20 blur-3xl"
          animate={{ scale: [1.2, 1, 1.2] }}
          transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
        />

        <div className="container mx-auto px-4 relative z-10">
          <motion.div
            className="max-w-3xl mx-auto text-center"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            <motion.div variants={itemVariants} className="mb-6">
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-sm">
                <MessageSquare className="w-4 h-4" />
                Get in Touch
              </span>
            </motion.div>
            <motion.h1
              variants={itemVariants}
              className="text-3xl md:text-4xl font-display font-normal mb-6"
            >
              <span className="bg-gradient-to-r from-white via-gray-200 to-gray-300 bg-clip-text text-transparent">
                Let's Start a
              </span>
              <br />
              <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                Conversation
              </span>
            </motion.h1>
            <motion.p
              variants={itemVariants}
              className="text-lg text-gray-300 mb-8"
            >
              Have questions about The 3rd Academy? We'd love to hear from you.
              Our team is here to help.
            </motion.p>
          </motion.div>
        </div>
      </section>

      {/* Contact Form Section */}
      <section className="py-20 relative">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 max-w-6xl mx-auto">
            {/* Form */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <div className="relative group">
                <div className="absolute -inset-2 rounded-3xl opacity-30 blur-xl bg-gradient-to-r from-indigo-600 to-purple-600" />
                <div className="relative p-8 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10">
                  {isSubmitted ? (
                    <motion.div
                      className="text-center py-12"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                    >
                      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-green-600/20 to-emerald-600/20 flex items-center justify-center mx-auto mb-6">
                        <CheckCircle className="w-8 h-8 text-green-400" />
                      </div>
                      <h3 className="text-2xl font-bold text-white mb-4">
                        Message Sent!
                      </h3>
                      <p className="text-gray-300 mb-6">
                        Thank you for reaching out. We'll get back to you within
                        24-48 hours.
                      </p>
                      <Button
                        variant="outline"
                        className="border-white/20 text-white hover:bg-white/10"
                        onClick={() => {
                          setIsSubmitted(false);
                          setFormData({
                            name: "",
                            email: "",
                            organization: "",
                            message: "",
                          });
                        }}
                      >
                        Send Another Message
                      </Button>
                    </motion.div>
                  ) : (
                    <>
                      <h2 className="text-2xl font-bold text-white mb-6">
                        Send us a Message
                      </h2>

                      {/* Reason Selection */}
                      <div className="mb-6">
                        <label className="block text-sm text-gray-300 mb-3">
                          What can we help you with?
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                          {contactReasons.map((reason) => (
                            <button
                              key={reason.id}
                              type="button"
                              onClick={() => setSelectedReason(reason.id)}
                              className={`p-3 rounded-xl border transition-all flex items-center gap-2 ${
                                selectedReason === reason.id
                                  ? "bg-indigo-600/20 border-indigo-500/50 text-white"
                                  : "bg-white/5 border-white/10 text-gray-300 hover:border-white/20"
                              }`}
                            >
                              <reason.icon className="w-4 h-4" />
                              <span className="text-sm">{reason.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm text-gray-300 mb-2">
                              Name
                            </label>
                            <Input
                              name="name"
                              value={formData.name}
                              onChange={handleChange}
                              placeholder="Your name"
                              required
                              className="bg-white/10 border-white/20 text-white placeholder:text-gray-500 focus:border-indigo-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm text-gray-300 mb-2">
                              Email
                            </label>
                            <Input
                              name="email"
                              type="email"
                              value={formData.email}
                              onChange={handleChange}
                              placeholder="you@example.com"
                              required
                              className="bg-white/10 border-white/20 text-white placeholder:text-gray-500 focus:border-indigo-500"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm text-gray-300 mb-2">
                            Organization (Optional)
                          </label>
                          <Input
                            name="organization"
                            value={formData.organization}
                            onChange={handleChange}
                            placeholder="Company or school name"
                            className="bg-white/10 border-white/20 text-white placeholder:text-gray-500 focus:border-indigo-500"
                          />
                        </div>

                        <div>
                          <label className="block text-sm text-gray-300 mb-2">
                            Message
                          </label>
                          <Textarea
                            name="message"
                            value={formData.message}
                            onChange={handleChange}
                            placeholder="How can we help you?"
                            required
                            rows={5}
                            className="bg-white/10 border-white/20 text-white placeholder:text-gray-500 focus:border-indigo-500 resize-none"
                          />
                        </div>

                        <motion.div
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <Button
                            type="submit"
                            className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
                            disabled={isSubmitting}
                          >
                            {isSubmitting ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Sending...
                              </>
                            ) : (
                              <>
                                <Send className="mr-2 h-4 w-4" />
                                Send Message
                              </>
                            )}
                          </Button>
                        </motion.div>
                      </form>
                    </>
                  )}
                </div>
              </div>
            </motion.div>

            {/* Contact Info */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="space-y-8"
            >
              <div>
                <h2 className="text-2xl font-bold text-white mb-4">
                  Contact Information
                </h2>
                <p className="text-gray-300">
                  Reach out directly or fill out the form and we'll get back to
                  you as soon as possible.
                </p>
              </div>

              <div className="space-y-4">
                {contactInfo.map((info, index) => (
                  <motion.a
                    key={index}
                    href={info.href}
                    className="group block"
                    whileHover={{ x: 5 }}
                  >
                    <div className="flex items-center gap-4 p-4 rounded-xl bg-white/5 border border-white/10 hover:border-indigo-500/30 transition-colors">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-600/20 to-purple-600/20 flex items-center justify-center">
                        <info.icon className="w-5 h-5 text-indigo-400" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">{info.label}</p>
                        <p className="text-white group-hover:text-indigo-400 transition-colors">
                          {info.value}
                        </p>
                      </div>
                    </div>
                  </motion.a>
                ))}
              </div>

              {/* Office Hours */}
              <div className="p-6 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10">
                <h3 className="text-lg font-semibold text-white mb-4">
                  Office Hours
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-300">Monday - Friday</span>
                    <span className="text-white">9:00 AM - 6:00 PM PST</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">Saturday</span>
                    <span className="text-white">10:00 AM - 4:00 PM PST</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">Sunday</span>
                    <span className="text-gray-500">Closed</span>
                  </div>
                </div>
              </div>

              {/* Response Time */}
              <div className="p-6 rounded-2xl bg-gradient-to-r from-indigo-600/10 to-purple-600/10 border border-indigo-500/20">
                <h3 className="text-lg font-semibold text-white mb-2">
                  Quick Response Promise
                </h3>
                <p className="text-gray-300 text-sm">
                  We aim to respond to all inquiries within 24-48 business hours.
                  For urgent matters, please call us directly.
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* FAQ CTA */}
      <section className="py-20 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-black via-purple-950/20 to-black" />
        <div className="container mx-auto px-4 relative z-10">
          <motion.div
            className="max-w-3xl mx-auto text-center"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              <span className="bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                Looking for Quick Answers?
              </span>
            </h2>
            <p className="text-gray-300 mb-8">
              Check out our Help Center for frequently asked questions and
              detailed guides.
            </p>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button
                size="lg"
                variant="outline"
                className="border-white/20 text-white hover:bg-white/10"
                asChild
              >
                <a href="/help">Visit Help Center</a>
              </Button>
            </motion.div>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Contact;
