import { useState, useRef } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function AlarmScriptGenerator() {
  // State variables for user inputs and script output
  const [machineName, setMachineName] = useState("");
  const [opData, setOpData] = useState("");
  const [output, setOutput] = useState("");
  const [defaultType, setDefaultType] = useState("CIO");
  const outputRef = useRef(null);

  // Expands a comma-separated address list into individual address entries
  const expandAddressList = (input) => {
    const items = input.split(",").map(s => s.trim()).filter(Boolean);
    const result = [];
    const errors = [];

    items.forEach(item => {
      // Match formats like CIO4012, W4021-4024, or 4030 (uses defaultType)
      const match = item.match(/^(CIO|W|D|H)?(\d+)(?:-(\d+))?$/i);
      if (match) {
        const type = (match[1] || defaultType).toUpperCase();
        const start = parseInt(match[2], 10);
        const end = match[3] ? parseInt(match[3], 10) : start;

        if (!isNaN(start) && !isNaN(end)) {
          for (let i = start; i <= end; i++) {
            result.push({ type, number: i });
          }
        }
      } else {
        // Collect invalid entries for alert
        errors.push(item);
      }
    });

    if (errors.length) {
      alert(`Skipped invalid address entries: ${errors.join(", ")}`);
    }

    return result;
  };

  // Generates SQL alarm script based on input data
  const generateScript = () => {
    const blocks = opData.trim().split(/\n+/);
    let fullScript = "";

    blocks.forEach(block => {
      const parts = block.split(":");
      if (parts.length !== 2) return;
      const opName = parts[0].trim();
      const addrLine = parts[1].trim();
      const addresses = expandAddressList(addrLine);

      const productVar = `${machineName}_${opName}Product`;
      const autoVar = `${machineName}_${opName}AutoNonAuto`;

      // Start of SQL script block
      let script = `SQL_VariableOpNumber = "${opName}";
SQL_VariableProduct = ${productVar};  {Product INT from this OP}
SQL_VariableAutoNonAuto = ${autoVar};  {PLC Auto Non/Auto Mode to SQL}`;

      // Generate SQL logic for each address
      addresses.forEach(({ type, number }) => {
        script += `\n\nIF ${machineName}_${type}_${number} <> 0 THEN
  SQL_Variable_AlarmWordNumber = "${type}${number}";  {Alarms Word address in PLC}
  SQL_Variable_AlarmBitsInDecimal = ${machineName}_${type}_${number};  {Gets alarm Value from a PLC Word}

   {Below will Insert all this info to dbo.EPBMachinAlarms Data Table Using Bindlist "EPBMachineAlarmsBindlist"}                                            
  SQLInsert(SQL_ProductionData_ConnID, "EPBMachineAlarms", "EPBMachineAlarmsBindlist");  {Will write to Database only if alarm register not = to zero}
ENDIF;`;
      });

      // Append section separator for readability
      fullScript += `{---------------------------------------------------------------------------------------------------------------------------}\n\n${script}\n\n{---------------------------------------------------------------------------------------------------------------------------}\n\n`;
    });

    setOutput(fullScript.trim());
  };

  // Copies generated script to clipboard with fallback
  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(output);
      alert("Script copied to clipboard!");
    } catch (err) {
      try {
        if (outputRef.current) {
          outputRef.current.select();
          document.execCommand("copy");
          alert("Script copied with fallback method!");
        } else {
          alert("Copy failed: Unable to access output text area.");
        }
      } catch (e) {
        alert("Copy failed: Clipboard permission denied or unsupported.");
      }
    }
  };

  // Downloads the generated script as a .txt file
  const downloadScript = () => {
    const blob = new Blob([output], { type: "text/plain;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${machineName || "alarm_script"}.txt`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  // UI Components
  return (
    <div className="p-4 space-y-4">
      {/* Machine name input */}
      <Input placeholder="Machine Name (e.g., AS33PerfTest)" value={machineName} onChange={(e) => setMachineName(e.target.value)} />

      {/* Dropdown for default address type */}
      <div className="space-y-2">
        <label className="block text-sm font-medium">Default Address Type (if not specified)</label>
        <select
          value={defaultType}
          onChange={(e) => setDefaultType(e.target.value)}
          className="border rounded px-2 py-1"
        >
          <option value="CIO">CIO</option>
          <option value="W">W</option>
          <option value="D">D</option>
          <option value="H">H</option>
        </select>
      </div>

      {/* Textarea for OP and address input */}
      <Textarea
        placeholder={`Enter each OP on a new line as: OpNumber: Addresses\nExample:\nOp115: CIO4012-4019, W4021, D4031-4034\nOp120: H6000-6005, 6010 (uses default)`}
        value={opData}
        onChange={(e) => setOpData(e.target.value)}
        rows={6}
      />

      {/* Action buttons */}
      <div className="space-x-2">
        <Button onClick={generateScript}>Generate Script</Button>
        <Button variant="secondary" onClick={copyToClipboard}>Copy to Clipboard</Button>
        <Button variant="secondary" onClick={downloadScript}>Download as .txt</Button>
      </div>

      {/* Output script display */}
      <Textarea ref={outputRef} rows={30} value={output} readOnly className="font-mono" />
    </div>
  );
}
